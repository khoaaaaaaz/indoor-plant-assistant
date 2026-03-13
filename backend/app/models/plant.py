from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Plant(Base):
  __tablename__ = "plants"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  name = Column(String)
  species = Column(String)
  next_water_date = Column(Date)
  created_at = Column(DateTime(timezone=True), server_default=func.now())

  owner = relationship("User", back_populates="plants")
  disease_logs = relationship("DiseaseLog", back_populates="plant")
  care_history = relationship("CareHistory", back_populates="plant")