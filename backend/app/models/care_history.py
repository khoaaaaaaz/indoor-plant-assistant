# app/models/care_history.py
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class CareHistory(Base):
    __tablename__ = "care_history"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    action_type = Column(String)
    action_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)

    # Relationship back to plant
    plant = relationship("Plant", back_populates="care_history")