from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.core.database import get_db
from app.models.user import User
from app.models.plant import Plant
from app.models.disease_log import DiseaseLog
from app.api.dependencies import get_current_user
from app.schemas.scan import DiseaseLogResponse, DiseaseLogFeedbackRequest
from app.services.perenual_api_service import parse_watering_to_days
from app.services.weather_service import get_weather_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Disease Logs"])

@router.get("/api/plants/{plant_id}/disease-logs", response_model=list[DiseaseLogResponse])
async def get_plant_scans(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all disease scans for a plant"""
    # Check plant exists and belongs to user
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant or plant.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Return all scans for this plant
    scans = db.query(DiseaseLog).filter(
        DiseaseLog.plant_id == plant_id
    ).order_by(DiseaseLog.scanned_at.desc()).all()
    
    return scans

@router.get("/api/disease-logs/{log_id}", response_model=DiseaseLogResponse)
async def get_scan_details(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single scan with all details"""
    log = db.query(DiseaseLog).filter(DiseaseLog.id == log_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Check user owns the plant
    if log.plant.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return log


@router.patch("/api/disease-logs/{log_id}/resolve", response_model=DiseaseLogResponse)
def resolve_disease_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a disease as resolved. Optionally reverts care adjustments
    if the plant's current values still match the disease-adjusted values
    (i.e., the user hasn't manually changed them since detection).
    """
    log = db.query(DiseaseLog).filter(DiseaseLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Disease log not found")
    
    # Check user owns the plant
    plant = log.plant
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if log.resolved_at:
        raise HTTPException(status_code=400, detail="Disease already resolved")
    
    # Mark as resolved
    log.resolved_at = datetime.now()
    
    # ── Revert care adjustments (with safety checks) ──
    # Only revert if:
    # 1. This log has care_adjustments with original_* values
    # 2. The plant's current value still matches the adjusted value
    #    (if they differ, user changed it manually → don't overwrite)
    adjustments = log.care_adjustments or {}
    reverted_fields = []
    
    # Revert watering_guide
    if adjustments.get("original_watering_guide") is not None:
        adjusted_watering = adjustments.get("watering_guide")
        if plant.watering_guide == adjusted_watering:
            plant.watering_guide = adjustments["original_watering_guide"]
            reverted_fields.append("watering_guide")
            
            # Recalculate next_water_date with restored watering cycle
            restored_days = parse_watering_to_days(plant.watering_guide)
            weather_service = get_weather_service()
            weather_data = weather_service.get_agri_weather(None, None)
            plant.next_water_date = weather_service.calculate_watering_date(
                base_days=restored_days,
                temperature=weather_data["temperature"],
                humidity=weather_data["humidity"],
                soil_moisture=weather_data["soil_moisture"],
                rainfall_mm=0,
            )
            reverted_fields.append("next_water_date")
    
    if reverted_fields:
        logger.info(f"Reverted care adjustments for plant {plant.id}: {reverted_fields}")
    else:
        logger.info(f"Disease {log_id} resolved — no care adjustments to revert")
    
    db.commit()
    db.refresh(log)
    
    return log


@router.post("/api/disease-logs/{log_id}/feedback", response_model=DiseaseLogResponse)
def submit_treatment_feedback(
    log_id: int,
    body: DiseaseLogFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback on treatment effectiveness after resolving a disease.
    
    Score: 1=very poor, 2=poor, 3=okay, 4=good, 5=fully recovered.
    Data is stored for developer review — no auto-adjustment of disease_data.json.
    """
    # Verify ownership via plant relationship
    log = db.query(DiseaseLog).join(Plant).filter(
        DiseaseLog.id == log_id,
        Plant.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Disease log not found")

    if not log.resolved_at:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit feedback before resolving treatment"
        )

    if not 1 <= body.score <= 5:
        raise HTTPException(status_code=422, detail="Score must be between 1 and 5")

    log.feedback_score = body.score
    log.feedback_note = body.note
    db.commit()
    db.refresh(log)

    logger.info(f"Feedback submitted for disease log {log_id}: score={body.score}")
    return log