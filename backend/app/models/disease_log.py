# app/models/disease_log.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DiseaseLog(Base):
    __tablename__ = "disease_logs"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    disease_name = Column(String)
    confidence = Column(Float)
    image_url = Column(String)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to plant
    plant = relationship("Plant", back_populates="disease_logs")