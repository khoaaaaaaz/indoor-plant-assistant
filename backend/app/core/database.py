from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


SQLALCHEMY_DATABASE_URL = "postgresql://admin:secretpassword@db:5432/plantdb"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoFlush=False,bind=engine)

Base = declarative_base()

def get_db():
  db = SessionLocal
  try:
    yield db
  finally:
    db.close()