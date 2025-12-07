pwd_context = CryptContext(schemes=["argon2", "bcrypt_sha256", "bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a password. If a backend raises the 72-byte ValueError (bcrypt),
    fall back to SHA-256 pre-hash and hash that instead.
    """
    try:
        return pwd_context.hash(plain_password)
    except ValueError as exc:
        msg = str(exc)
        if "72" in msg or "longer than 72" in msg:
            pre = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
            return pwd_context.hash(pre)
        raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password. If verification raises the 72-byte ValueError,
    pre-hash the plain password with SHA-256 and try again.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError as exc:
        msg = str(exc)
        if "72" in msg or "longer than 72" in msg:
            pre = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
            return pwd_context.verify(pre, hashed_password)
        raise

##registration endpoint
@app.post('/registration')
async def register_user(user: UserCreat):
    db = Session()
    try:
        existing_user = db.query(User).filter(User.username == user.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")

        hashed_password = hash_password(user.password)

        db_user = User(
            username=user.username,
            password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"message": "User registered successfully"}
    finally:
        db.close()

##login endpoint
@app.post('/login')
async def login_user(user: Userlogin):
    db = Session()
    try:
        db_user = db.query(User).filter(User.username == user.username).first()

        if not db_user or not verify_password(user.password, db_user.password):
            raise HTTPException(status_code=400, detail="Invalid username or password")

        return {"message": "Login successful"}
    finally:
        db.close()

class UserCreat(BaseModel):
    username: str
    password: str

    class Config:
        orm_mode = True

class Userlogin(BaseModel):
    id: Optional[int] = None
    username: str
    password: str

class User(Base):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)