from database import Session
from dbmodel import User


def main():
    db = Session()
    try:
        users = db.query(User).all()
        if not users:
            print("No users found")
            return
        print("id\tusername\thashed_password")
        for u in users:
            print(f"{u.id}\t{u.username}\t{u.password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
