# app/models/disease_log.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DiseaseLog(Base):
    __tablename__ = "disease_logs"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    
    # AI Results
    disease_name = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    
    # Week 3: Environmental context from Open-Meteo at time of scan
    env_temperature = Column(Float, nullable=True)  # Celsius
    env_humidity = Column(Float, nullable=True)  # Percentage (0-100)
    soil_moisture = Column(Float, nullable=True)  # Percentage (0-100)
    
    # Species detected by AI (Week 3)
    detected_species = Column(String, nullable=True)  # From AI service
    # LLM-generated treatment advice (markdown text for display)
    treatment_recommendation = Column(String, nullable=True)
    
    # Structured care adjustments from LLM (JSON blob)
    # Contains adjusted values + original_* values for safe revert on resolve.
    # Shape: { watering_guide, watering_frequency_days, mist_frequency_days,
    #          sunlight_adjustment, fertilize_pause, notes,
    #          original_watering_guide, original_next_water_date }
    care_adjustments = Column(JSON, nullable=True)
    
    # Disease resolution tracking — null means still active
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Treatment protocol (Phase 2) — from static disease cache
    # treatment_duration_days: recommended days of treatment (e.g., 14 for Anthracnose)
    # expected_resolve_date: scan_date + duration_days — enables frontend countdown
    treatment_duration_days = Column(Integer, nullable=True)
    expected_resolve_date = Column(Date, nullable=True)
    
    # User feedback (Phase 3) — post-treatment rating
    # score: 1=very poor, 2=poor, 3=okay, 4=good, 5=fully recovered
    # note: optional free-text from user about treatment effectiveness
    feedback_score = Column(Integer, nullable=True)
    feedback_note = Column(String, nullable=True)
    
    # SHA-256 hash of the uploaded image — prevents same user scanning identical image twice
    image_hash = Column(String, nullable=True, index=True)
    
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to plant
    plant = relationship("Plant", back_populates="disease_logs")