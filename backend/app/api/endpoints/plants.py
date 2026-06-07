# app/api/endpoints/plants.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.services.perenual_api_service import parse_watering_to_days
from app.core.database import get_db
from app.models.plant import Plant
from app.models.user import User
from app.schemas.plant import PlantCreate, PlantResponse, PlantUpdate
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/defer-watering")
def defer_watering(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Smart weather-based watering deferral.
    
    Finds all of the user's plants that are due for watering today (or overdue),
    and pushes their next_water_date forward by one watering cycle.
    
    Called from the WeatherWidget when conditions suggest skipping watering
    (e.g., rain, high humidity).
    """
    today = date.today()
    
    # Find all plants due today or earlier
    plants_due = db.query(Plant).filter(
        Plant.user_id == current_user.id,
        Plant.next_water_date <= today
    ).all()
    
    updated_count = 0
    for plant in plants_due:
        # Push forward by one cycle based on the plant's watering guide
        cycle_days = parse_watering_to_days(plant.watering_guide or "Average")
        plant.next_water_date = today + timedelta(days=cycle_days)
        updated_count += 1
    
    if updated_count > 0:
        db.commit()
    
    return {
        "updated_count": updated_count,
        "next_check": str(today + timedelta(days=1)),
    }

@router.post("/", response_model=PlantResponse)
def create_plant(
    plant: PlantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    calculated_water_date = plant.next_water_date
    if not calculated_water_date and plant.watering_guide:
        days = parse_watering_to_days(plant.watering_guide)
        calculated_water_date = date.today() + timedelta(days=days)

    new_plant = Plant(
        user_id=current_user.id,
        name=plant.name,
        species=plant.species,
        next_water_date=calculated_water_date,
        image_url=plant.image_url,
        sunlight_requirement=plant.sunlight_requirement,
        watering_guide=plant.watering_guide,
        care_level=plant.care_level,
        is_toxic_to_pets=plant.is_toxic_to_pets,
        botanical_data=plant.botanical_data,
    )
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)
    
    return new_plant

@router.get("/", response_model=List[PlantResponse])
def get_user_plants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch all plants belonging to the current user
    plants = db.query(Plant).filter(Plant.user_id == current_user.id).all()
    return plants

@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single plant details"""
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return plant

@router.put("/{plant_id}", response_model=PlantResponse)
def update_plant(
    plant_id: int,
    plant_update: PlantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update plant details"""
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update only provided fields
    if plant_update.name is not None:
        plant.name = plant_update.name
    if plant_update.species is not None:
        plant.species = plant_update.species
    if plant_update.next_water_date is not None:
        plant.next_water_date = plant_update.next_water_date
    if plant_update.image_url is not None:
        plant.image_url = plant_update.image_url
    
    db.commit()
    db.refresh(plant)
    return plant

@router.post("/{plant_id}/refresh-botanical", response_model=PlantResponse)
async def refresh_botanical_data(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Re-fetch botanical_data from Perenual/LLM for an existing plant.
    
    Only updates the `botanical_data` JSON blob (static display info).
    Does NOT modify care-related fields (next_water_date, watering_guide,
    sunlight_requirement, care_level) to preserve existing care schedules.
    """
    from app.services.perenual_api_service import get_perenual_service
    
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not plant.species:
        raise HTTPException(status_code=400, detail="Plant has no species to look up")
    
    perenual = get_perenual_service()
    care_info = await perenual.fetch_plant_care_info_with_llm_fallback(plant.species)
    
    if care_info and care_info.get("botanical_data"):
        plant.botanical_data = care_info["botanical_data"]
        db.commit()
        db.refresh(plant)
    
    return plant

@router.delete("/{plant_id}", status_code=204)
def delete_plant(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete plant (cascades to disease_logs, care_history)"""
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(plant)
    db.commit()
    return None