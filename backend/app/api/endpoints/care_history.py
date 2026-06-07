# app/api/endpoints/care_history.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.plant import Plant
from app.models.care_history import CareHistory
from app.api.dependencies import get_current_user
from app.schemas.care_history import CareHistoryCreate, CareHistoryResponse
from app.services.perenual_api_service import parse_watering_to_days

router = APIRouter(tags=["Care History"])

@router.post("/{plant_id}/care-history", response_model=CareHistoryResponse)
def log_care_action(
    plant_id: int,
    care_data: CareHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log a care action (watering, misting, fertilizing, etc.) for a plant.
    
    Called from the frontend when a user marks a care task as complete.
    The plant_id is extracted from the URL, not the request body.
    action_date is auto-set by the database to now().
    """
    # Verify plant exists and belongs to current user
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Reject future task completions (server-side guard)
    if care_data.task_due_date and care_data.task_due_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot complete future tasks")
    
    # Create care history record
    care_record = CareHistory(
        plant_id=plant_id,
        action_type=care_data.action_type,
        notes=care_data.notes
    )
    db.add(care_record)
    
    # Advance next_water_date if watering
    if care_data.action_type == 'water':
        cycle_days = parse_watering_to_days(plant.watering_guide or "Average")
        plant.next_water_date = date.today() + timedelta(days=cycle_days)
        
    db.commit()
    db.refresh(care_record)
    
    return care_record

@router.get("/{plant_id}/care-history", response_model=List[CareHistoryResponse])
def get_care_history(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all care actions for a specific plant, newest first.
    
    Used on the Plant Detail page to show care timeline.
    """
    # Verify plant exists and belongs to current user
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    history = db.query(CareHistory).filter(
        CareHistory.plant_id == plant_id
    ).order_by(CareHistory.action_date.desc()).all()
    
    return history
