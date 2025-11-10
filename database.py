from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine

db_url = "postgresql://postgres:1234@localhost:5432/postgres"
engine = create_engine(db_url)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()