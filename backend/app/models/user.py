from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
  __tablename__ = "users"
  
  id = Column(Integer, primary_key = True, index = True)
  email = Column(String, unique =True, index = True, nullable=False)
  password_hash = Column(String, nullable=False)
  full_name = Column(String)
  role = Column(String, default="user")
  created_at = Column(DateTime(timezone=True), server_default=func.now())
  
  plants = relationship("Plants", back_populated="owner")