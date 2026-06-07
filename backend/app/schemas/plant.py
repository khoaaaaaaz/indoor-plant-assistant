# app/schemas/plant.py
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Any

class PlantBase(BaseModel):
    name: str
    species: Optional[str] = None
    next_water_date: Optional[date] = None
    image_url: Optional[str] = None

class PlantCreate(PlantBase):
    sunlight_requirement: Optional[str] = None
    watering_guide: Optional[str] = None
    care_level: Optional[str] = None
    is_toxic_to_pets: Optional[bool] = False
    botanical_data: Optional[dict[str, Any]] = None

class PlantUpdate(BaseModel):
    """Schema for partial plant updates"""
    name: Optional[str] = None
    species: Optional[str] = None
    next_water_date: Optional[date] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None

class PlantResponse(PlantBase):
    id: int
    user_id: int
    # Week 3: Botanical data from Perenual API
    sunlight_requirement: Optional[str] = None
    watering_guide: Optional[str] = None
    care_level: Optional[str] = None
    is_toxic_to_pets: bool
    # Week 4: Extended botanical data JSON blob
    botanical_data: Optional[dict[str, Any]] = None
    has_active_disease: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class PlantDetailResponse(PlantResponse):
    """Extended response with full botanical info for display"""
    care_tips: Optional[str] = None  # Computed field for UI