import argparse
import getpass
import hashlib
from database import Session
from dbmodel import User
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["argon2", "bcrypt_sha256", "bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    try:
        return pwd_context.hash(plain_password)
    except ValueError as exc:
        msg = str(exc)
        if "72" in msg or "longer than 72" in msg:
            pre = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
            return pwd_context.hash(pre)
        raise


def reset_password(username: str, new_password: str):
    db = Session()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print("User not found")
            return
        user.password = hash_password(new_password)
        db.commit()
        print(f"Password for '{username}' has been reset.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Reset a user's password")
    parser.add_argument('username', help='username to reset')
    parser.add_argument('password', nargs='?', help='new password (optional, will prompt if not provided)')
    args = parser.parse_args()

    if args.password:
        new_pw = args.password
    else:
        new_pw = getpass.getpass(prompt='New password: ')
        confirm = getpass.getpass(prompt='Confirm password: ')
        if new_pw != confirm:
            print('Passwords do not match')
            return

    reset_password(args.username, new_pw)


if __name__ == '__main__':
    main()
