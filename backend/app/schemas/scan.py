# app/schemas/scan.py
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, Any

class DiseaseLogResponse(BaseModel):
    id: int
    plant_id: int
    disease_name: Optional[str] = None
    confidence: Optional[float] = None
    detected_species: Optional[str] = None
    image_url: Optional[str] = None
    # Week 3: Environmental context
    env_temperature: Optional[float] = None
    env_humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    
    # LLM-generated treatment advice (markdown text)
    treatment_recommendation: Optional[str] = None
    # Structured care adjustments from LLM
    care_adjustments: Optional[dict[str, Any]] = None
    
    # Treatment protocol (Phase 2)
    treatment_duration_days: Optional[int] = None
    expected_resolve_date: Optional[date] = None
    
    # User feedback (Phase 3)
    feedback_score: Optional[int] = None
    feedback_note: Optional[str] = None
    
    # Disease resolution tracking
    resolved_at: Optional[datetime] = None
    
    scanned_at: datetime

    class Config:
        from_attributes = True


class DiseaseLogFeedbackRequest(BaseModel):
    """Request body for POST /{log_id}/feedback"""
    score: int         # 1=very poor … 5=fully recovered
    note: Optional[str] = None

class SpeciesScanResponse(BaseModel):
    """Response for /api/scan/species flow (Flow 1)"""
    species_identified: Optional[str] = None
    confidence: Optional[float] = None
    
    # Botanical data (from Perenual)
    sunlight_requirement: Optional[str] = None
    watering_guide: Optional[str] = None
    care_level: Optional[str] = None
    is_toxic_to_pets: bool
    description: Optional[str] = None
    
    # Extended botanical data (JSON blob for display)
    botanical_data: Optional[dict] = None
    
    # File info
    image_url: str

class DiseaseScanResponse(BaseModel):
    """Response for /api/scan/disease flow (Flow 2)"""
    scan_id: int
    plant_id: int
    disease_detected: Optional[str] = None
    disease_confidence: Optional[float] = None
    
    # Environmental context (from Open-Meteo)
    env_temperature: Optional[float] = None
    env_humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    
    # Calculated watering schedule
    next_water_date: date
    
    # File info
    image_url: str
    scanned_at: datetime
    treatment_recommendation: Optional[str] = None
    # Structured care adjustments from LLM
    care_adjustments: Optional[dict[str, Any]] = None
    # Species-disease affinity warning (Upgrade 1)
    species_affinity_warning: Optional[str] = None