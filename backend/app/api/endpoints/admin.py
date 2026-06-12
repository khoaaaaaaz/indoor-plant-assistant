# app/api/endpoints/admin.py
"""
Admin endpoints for cache verification, dashboard statistics, and feedback analysis.

Demo-ready for graduation thesis defense:
  GET /api/admin/me
  GET /api/admin/stats
  GET /api/admin/feedbacks
  GET /api/admin/feedback-summary
  GET /api/admin/verify-cache
"""

from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.plant import Plant
from app.models.disease_log import DiseaseLog
from app.api.dependencies import require_admin, get_current_user
from app.services.perenual_api_service import get_perenual_service, _SPECIES_CACHE
from app.services.llm_service import get_disease_recommendation, _DISEASE_CACHE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/me")
async def get_admin_status(
    current_user: User = Depends(get_current_user)
):
    """
    Lightweight check to verify if the logged-in user is a whitelisted admin.
    Returns 200 OK with is_admin=True/False to avoid console 403 errors.
    """
    import os
    admin_emails_str = os.getenv("ADMIN_EMAILS", "")
    admin_emails = {email.strip().lower() for email in admin_emails_str.split(",") if email.strip()}
    
    is_admin = (current_user.email and current_user.email.lower() in admin_emails) or (current_user.role == "admin")
    
    return {
        "is_admin": is_admin,
        "email": current_user.email
    }


@router.get("/stats")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Fetch system-wide statistics for the admin dashboard.
    Scans over time are time-bounded to the last 14 days for optimal database performance.
    """
    # 1. Lifetime totals (cheap scalar queries)
    total_users = db.query(User).count()
    total_plants = db.query(Plant).count()
    total_scans = db.query(DiseaseLog).count()
    
    total_diseases_detected = db.query(DiseaseLog).filter(DiseaseLog.disease_name.isnot(None)).count()
    total_healthy_scans = db.query(DiseaseLog).filter(DiseaseLog.disease_name == None).count()
    total_resolved = db.query(DiseaseLog).filter(DiseaseLog.resolved_at.isnot(None)).count()
    total_feedbacks = db.query(DiseaseLog).filter(DiseaseLog.feedback_score.isnot(None)).count()
    
    # Average confidence of AI disease/healthy scans
    avg_confidence_val = db.query(func.avg(DiseaseLog.confidence)).scalar()
    avg_confidence = round(float(avg_confidence_val), 2) if avg_confidence_val is not None else 0.0

    # 2. Time-bounded scans over time (last 14 days)
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    
    recent_scans = db.query(DiseaseLog.scanned_at).filter(
        DiseaseLog.scanned_at >= fourteen_days_ago
    ).order_by(DiseaseLog.scanned_at.asc()).all()
    
    scans_by_day = defaultdict(int)
    # Pre-populate all 14 days so the chart shows zeroes for inactive days
    for i in range(15):
        day = (datetime.utcnow() - timedelta(days=14-i)).strftime("%Y-%m-%d")
        scans_by_day[day] = 0
        
    for scan in recent_scans:
        day_str = scan.scanned_at.strftime("%Y-%m-%d")
        scans_by_day[day_str] += 1
        
    scans_over_time = [{"date": k, "count": v} for k, v in sorted(scans_by_day.items())]

    # 3. Disease distribution (lifetime)
    disease_counts = db.query(
        DiseaseLog.disease_name, 
        func.count(DiseaseLog.id)
    ).filter(
        DiseaseLog.disease_name.isnot(None)
    ).group_by(
        DiseaseLog.disease_name
    ).order_by(
        func.count(DiseaseLog.id).desc()
    ).all()
    
    disease_distribution = [
        {"disease": name, "count": count} 
        for name, count in disease_counts
    ]

    # 4. Top species scanned (lifetime)
    species_counts = db.query(
        DiseaseLog.detected_species,
        func.count(DiseaseLog.id)
    ).filter(
        DiseaseLog.detected_species.isnot(None)
    ).group_by(
        DiseaseLog.detected_species
    ).order_by(
        func.count(DiseaseLog.id).desc()
    ).limit(5).all()
    
    top_species_scanned = [
        {"species": species, "count": count}
        for species, count in species_counts
    ]

    return {
        "total_users": total_users,
        "total_plants": total_plants,
        "total_scans": total_scans,
        "total_diseases_detected": total_diseases_detected,
        "total_healthy_scans": total_healthy_scans,
        "total_resolved": total_resolved,
        "total_feedbacks": total_feedbacks,
        "avg_confidence": avg_confidence,
        "disease_distribution": disease_distribution,
        "scans_over_time": scans_over_time,
        "top_species_scanned": top_species_scanned
    }


@router.get("/feedbacks")
async def get_admin_feedbacks(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Retrieve individual user feedback submissions, including plant name and user email.
    Sorted by scanned_at descending.
    """
    base_filter = db.query(DiseaseLog).filter(
        DiseaseLog.feedback_score.isnot(None)
    )
    
    total = base_filter.count()
    logs = base_filter.options(
        joinedload(DiseaseLog.plant).joinedload(Plant.owner)
    ).order_by(DiseaseLog.scanned_at.desc()).offset(offset).limit(limit).all()
    
    items = []
    for log in logs:
        plant = log.plant
        user = plant.owner if plant else None
        
        items.append({
            "id": log.id,
            "plant_name": plant.name if plant else "Unknown",
            "disease_name": log.disease_name or "Healthy",
            "confidence": log.confidence,
            "feedback_score": log.feedback_score,
            "feedback_note": log.feedback_note,
            "user_email": user.email if user else "Unknown",
            "resolved_at": log.resolved_at.isoformat() if log.resolved_at else None,
            "scanned_at": log.scanned_at.isoformat() if log.scanned_at else None
        })
        
    return {
        "items": items,
        "total": total
    }


@router.get("/verify-cache")
async def verify_cache(
    type: str = Query(..., description="'species' or 'disease'"),
    name: str = Query(..., description="Species name or disease name to verify"),
    current_user: User = Depends(require_admin),
):
    """
    Compare static cache data with live API responses.
    Used to verify the accuracy of cached data.

    Admin only — bypasses cache to make live API calls.
    """
    if type == "species":
        return await _verify_species_cache(name)
    elif type == "disease":
        return await _verify_disease_cache(name)
    else:
        raise HTTPException(status_code=400, detail="type must be 'species' or 'disease'")


async def _verify_species_cache(species_name: str) -> dict:
    """Compare species static cache vs live Perenual API data."""
    cached_data = _SPECIES_CACHE.get(species_name)

    perenual_service = get_perenual_service()
    try:
        live_data = await perenual_service.fetch_plant_care_info_with_llm_fallback(
            species_name, _bypass_cache=True
        )
    except Exception as e:
        live_data = None
        logger.warning(f"Live API call failed for {species_name}: {e}")

    if not cached_data:
        return {
            "status": "NOT_IN_CACHE",
            "name": species_name,
            "cached_data": None,
            "live_data": live_data,
            "message": "This species is not in static cache — will use live API."
        }

    differences = {}
    if live_data:
        for key in cached_data:
            if str(cached_data.get(key)) != str(live_data.get(key)):
                differences[key] = {
                    "cached": cached_data.get(key),
                    "live": live_data.get(key),
                }

    return {
        "status": "MATCH" if not differences else "DRIFT_DETECTED",
        "name": species_name,
        "cached_data": cached_data,
        "live_data": live_data,
        "differences": differences,
        "message": (
            "✅ Cache matches live API."
            if not differences
            else f"⚠️ {len(differences)} field(s) differ. Consider updating JSON."
        ),
    }


async def _verify_disease_cache(disease_name: str) -> dict:
    """Compare disease static cache vs live Gemini LLM response."""
    cached_data = _DISEASE_CACHE.get(disease_name)

    try:
        live_en = await get_disease_recommendation(
            plant_species=None,
            disease_name=disease_name,
            confidence=0.9,
            language="en",
            _bypass_cache=True,
        )
        live_vi = await get_disease_recommendation(
            plant_species=None,
            disease_name=disease_name,
            confidence=0.9,
            language="vi",
            _bypass_cache=True,
        )
        live_data = {"en": live_en, "vi": live_vi}
    except Exception as e:
        live_data = None
        logger.warning(f"Live LLM call failed for {disease_name}: {e}")

    if not cached_data:
        return {
            "status": "NOT_IN_CACHE",
            "name": disease_name,
            "cached_data": None,
            "live_data": live_data,
            "message": "This disease is not in static cache — will use live Gemini."
        }

    return {
        "status": "CACHE_EXISTS",
        "name": disease_name,
        "treatment_duration_days": cached_data.get("treatment_duration_days"),
        "cached_data": cached_data,
        "live_data": live_data,
        "message": "Compare cached_data vs live_data to decide if JSON update is needed."
    }


@router.get("/feedback-summary")
def get_feedback_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Aggregate treatment feedback by disease.

    Splits by AI confidence tier (>= 80% vs < 80%) to distinguish
    bad treatment advice from inaccurate model predictions.

    Admin only.
    """
    # Fetch all resolved logs that have feedback
    logs = db.query(DiseaseLog).filter(
        DiseaseLog.feedback_score.isnot(None),
        DiseaseLog.resolved_at.isnot(None),
    ).all()

    # Group by disease name
    grouped = defaultdict(list)
    for log in logs:
        grouped[log.disease_name].append(log)

    per_disease = {}
    for disease_name, entries in grouped.items():
        scores = [e.feedback_score for e in entries]
        avg_score = round(sum(scores) / len(scores), 2)

        # Split by AI confidence tier
        high_conf = [e for e in entries if (e.confidence or 0) >= 0.80]
        low_conf = [e for e in entries if (e.confidence or 0) < 0.80]

        high_conf_avg = (
            round(sum(e.feedback_score for e in high_conf) / len(high_conf), 2)
            if high_conf else None
        )
        low_conf_avg = (
            round(sum(e.feedback_score for e in low_conf) / len(low_conf), 2)
            if low_conf else None
        )

        per_disease[disease_name] = {
            "feedback_count": len(entries),
            "avg_score": avg_score,
            "high_confidence_avg_score": high_conf_avg,
            "low_confidence_avg_score": low_conf_avg,
            "flag": (
                "⚠️ Low satisfaction — consider updating treatment advice"
                if avg_score < 3.0 else None
            ),
        }

    return {
        "total_feedbacks": len(logs),
        "note": (
            "Use flagged diseases with GET /api/admin/verify-cache "
            "to compare cached vs live recommendations."
        ),
        "per_disease": per_disease,
    }
