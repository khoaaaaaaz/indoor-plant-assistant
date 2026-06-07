from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Form
from fastapi.concurrency import run_in_threadpool
import asyncio
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.plant import Plant
from app.models.disease_log import DiseaseLog
from app.api.dependencies import get_current_user
from app.schemas.scan import SpeciesScanResponse, DiseaseScanResponse, DiseaseLogResponse
from app.services.ai_service import get_ai_service
from app.services.perenual_api_service import get_perenual_service, parse_watering_to_days
from app.services.weather_service import get_weather_service
from app.services.llm_service import get_disease_recommendation, _DISEASE_CACHE
from app.services.cloudinary_service import upload_image
from pathlib import Path
import shutil
import os
from datetime import datetime, date, timedelta
from typing import Optional
import hashlib
import logging
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["scan"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/scan/species", response_model=SpeciesScanResponse)
async def scan_species(
    image: UploadFile = File(...),
    language: str = "en",
    current_user: User = Depends(get_current_user),
):
    """
    Flow 1: Identify a new plant species and fetch its care data.
    Does not save to DB.
    """
    # 1. Validate MIME
    if image.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPG/PNG files allowed" if language == "en" else "Chỉ chấp nhận tệp tin định dạng JPG/PNG"
        )
    
    # Optional size check
    image.file.seek(0, 2)
    size = image.file.tell()
    image.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large" if language == "en" else "Tệp tin kích thước quá lớn"
        )

    # PIL Image Integrity Gate
    try:
        img = Image.open(image.file)
        img.verify()
        image.file.seek(0)
    except (UnidentifiedImageError, Exception) as e:
        logger.error(f"Image integrity verification failed: {e}")
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is corrupted or invalid."
            if language == "en" else
            "Hình ảnh tải lên bị lỗi hoặc không hợp lệ."
        )

    # 2. Save temporary file for AI processing
    temp_dir = UPLOAD_DIR / "temp"
    temp_dir.mkdir(exist_ok=True, parents=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
    file_path = temp_dir / f"species_{timestamp}.{file_extension}"
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    try:
        # 3. AI & Botanical Data
        ai_service = get_ai_service()
        perenual_service = get_perenual_service()

        # Run AI inference in threadpool with a 15-second timeout
        try:
            detected_species, species_confidence = await asyncio.wait_for(
                run_in_threadpool(ai_service.identify_species, str(file_path)),
                timeout=15.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Species scan timed out after 15s: {file_path}")
            raise HTTPException(
                status_code=408,
                detail="Processing timed out. Please try uploading a smaller or clearer image."
                if language == "en" else
                "Quá thời gian xử lý ảnh. Vui lòng chụp ảnh nhỏ hơn hoặc rõ hơn."
            )
        except Exception as e:
            logger.error(f"AI Species identification failed: {e}")
            raise HTTPException(
                status_code=500,
                detail="AI Model inference failed."
                if language == "en" else
                "Không thể chạy mô hình AI phân tích ảnh."
            )

        # Layer 3: Confidence threshold gate
        if species_confidence < 0.50:
            raise HTTPException(
                status_code=422,
                detail="No recognizable indoor plant detected. Please try scanning closer to the plant."
                if language == "en" else
                "Không tìm thấy loại cây trong nhà nào trong ảnh. Vui lòng chụp gần và rõ hơn."
            )

        plant_care_info = {
            "sunlight_requirement": "Unknown",
            "watering_guide": "Average",
            "care_level": "Unknown",
            "is_toxic_to_pets": False,
        }
        
        async def fetch_care_data():
            if detected_species:
                info = await perenual_service.fetch_plant_care_info_with_llm_fallback(detected_species)
                if info:
                    # Only merge non-None values so we don't overwrite safe defaults
                    plant_care_info.update({k: v for k, v in info.items() if v is not None})
        
        async def upload_image_task():
            return await run_in_threadpool(
                upload_image, str(file_path), folder=f"flora_mentor/users/{current_user.clerk_id}/temp"
            )

        # Fetch botanical data and upload image concurrently
        _, secure_url = await asyncio.gather(
            fetch_care_data(),
            upload_image_task()
        )

        return SpeciesScanResponse(
            species_identified=detected_species,
            confidence=species_confidence,
            sunlight_requirement=plant_care_info.get("sunlight_requirement"),
            watering_guide=plant_care_info.get("watering_guide"),
            care_level=plant_care_info.get("care_level"),
            is_toxic_to_pets=plant_care_info.get("is_toxic_to_pets", False),
            description=plant_care_info.get("description"),
            botanical_data=plant_care_info.get("botanical_data"),
            image_url=secure_url
        )

    finally:
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete temp file {file_path}: {e}")

@router.post("/scan/disease", response_model=DiseaseScanResponse)
async def scan_disease(
    plant_id: int = Form(...),
    image: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    language: str = Form("en"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Flow 2: Diagnose health problem for an existing plant.
    Saves to DB.
    """
    # 1. Validate
    if image.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPG/PNG files allowed" if language == "en" else "Chỉ chấp nhận tệp tin định dạng JPG/PNG"
        )
        
    image.file.seek(0, 2)
    size = image.file.tell()
    image.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large" if language == "en" else "Tệp tin kích thước quá lớn"
        )

    # PIL Image Integrity Gate
    try:
        img = Image.open(image.file)
        img.verify()
        image.file.seek(0)
    except (UnidentifiedImageError, Exception) as e:
        logger.error(f"Image integrity verification failed: {e}")
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is corrupted or invalid."
            if language == "en" else
            "Hình ảnh tải lên bị lỗi hoặc không hợp lệ."
        )

    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=404,
            detail="Plant not found" if language == "en" else "Không tìm thấy cây này trong vườn"
        )
    if plant.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized" if language == "en" else "Bạn không có quyền thực hiện thao tác này"
        )

    # 1b. Duplicate image check — hash before expensive AI/LLM processing
    image_bytes = await image.read()
    image_hash = hashlib.sha256(image_bytes).hexdigest()
    image.file.seek(0)  # Reset for later use
    
    existing_scan = db.query(DiseaseLog).join(Plant).filter(
        Plant.user_id == current_user.id,
        DiseaseLog.image_hash == image_hash,
    ).first()
    if existing_scan:
        raise HTTPException(
            status_code=409,
            detail="This image has already been scanned. Please take a new photo."
            if language == "en" else
            "Hình ảnh này đã được quét trước đó. Vui lòng chụp ảnh mới."
        )

    # 2. Save File
    plant_upload_dir = UPLOAD_DIR / str(plant_id)
    plant_upload_dir.mkdir(exist_ok=True, parents=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
    file_path = plant_upload_dir / f"disease_{timestamp}.{file_extension}"
    
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    try:
        # 3. Orchestration
        ai_service = get_ai_service()
        weather_service = get_weather_service()
        
        # Run AI inference in threadpool with a 15-second timeout
        try:
            diagnosis = await asyncio.wait_for(
                run_in_threadpool(ai_service.diagnose_disease, str(file_path)),
                timeout=15.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Disease scan timed out after 15s: {file_path}")
            raise HTTPException(
                status_code=408,
                detail="Processing timed out. Please try uploading a smaller or clearer image."
                if language == "en" else
                "Quá thời gian phân tích bệnh. Vui lòng chụp ảnh nhỏ hơn hoặc rõ hơn."
            )
        except Exception as e:
            logger.error(f"AI Disease diagnosis failed: {e}")
            raise HTTPException(
                status_code=500,
                detail="AI Model inference failed."
                if language == "en" else
                "Không thể chạy mô hình AI chẩn đoán bệnh."
            )

        disease_name = diagnosis["disease_name"]
        disease_confidence = diagnosis["confidence"]
        is_healthy = diagnosis["is_healthy"]
        ai_detected_species = diagnosis["detected_species"]
        
        # Layer 3: Confidence threshold gate
        if disease_confidence < 0.45:
            raise HTTPException(
                status_code=422,
                detail="Could not reliably analyze this image. Please ensure the photo has a clear view of the plant leaf or stem."
                if language == "en" else
                "Không thể phân tích chính xác hình ảnh này. Vui lòng chụp rõ lá hoặc thân cây."
            )
        
        weather_data = await run_in_threadpool(
            weather_service.get_agri_weather, latitude, longitude
        )

        # Get LLM treatment advice — only if a disease is detected with confidence
        treatment_recommendation = None
        care_adjustments = None
        llm_result = None
        if disease_name and not is_healthy:
            try:
                # Use the AI-detected species for more accurate recommendations
                species_for_llm = ai_detected_species if ai_detected_species != "Unknown" else plant.species
                llm_result = await get_disease_recommendation(
                    plant_species=species_for_llm,
                    disease_name=disease_name,
                    confidence=disease_confidence,
                    temperature=weather_data.get("temperature"),
                    humidity=weather_data.get("humidity"),
                    language=language,
                )
                if llm_result:
                    treatment_recommendation = llm_result.get("advice")
                    care_adjustments = llm_result.get("care_adjustments")
            except Exception as e:
                logger.error(f"Failed to get LLM recommendation: {e}")

        # Extract treatment duration from llm_result (populated by static cache)
        treatment_duration = None
        expected_resolve = None
        if llm_result and not is_healthy:
            treatment_duration = llm_result.get("treatment_duration_days")
            if treatment_duration:
                expected_resolve = date.today() + timedelta(days=treatment_duration)

        # Calculate next watering date (may be overridden by care_adjustments below)
        watering_days = parse_watering_to_days(plant.watering_guide or "Average")

        # --- Species-Disease Affinity Check ---
        species_affinity_warning = None
        if disease_name and not is_healthy:
            disease_entry = _DISEASE_CACHE.get(disease_name, {})
            susceptible = disease_entry.get("susceptible_species", [])

            # Compare against both AI-detected species (short name) and
            # plant.species (display name, may include parenthetical suffix)
            ai_species_lower = (ai_detected_species or "").lower()
            plant_species_lower = (plant.species or "").lower()
            match = any(
                s.lower() == ai_species_lower or
                plant_species_lower.startswith(s.lower())
                for s in susceptible
            )

            if susceptible and not match:
                species_affinity_warning = (
                    f"{disease_name} is uncommon for {plant.species}. "
                    f"The AI model was trained on: {', '.join(susceptible)}. "
                    f"Consider rescanning or consulting a plant expert."
                )
        # --- End Affinity Check ---
        
        next_water_date = weather_service.calculate_watering_date(
            base_days=watering_days,
            temperature=weather_data["temperature"],
            humidity=weather_data["humidity"],
            soil_moisture=weather_data["soil_moisture"],
            rainfall_mm=0,
        )

        # 4. Persistence
        plant.next_water_date = next_water_date
        
        # ── Apply care adjustments from LLM ──
        # Race condition guard: only apply if no other unresolved disease exists.
        # If the plant already has an active disease, we save the log but skip
        # modifying the plant's care schedule (the first disease's adjustments take precedence).
        has_unresolved_disease = db.query(DiseaseLog).filter(
            DiseaseLog.plant_id == plant_id,
            DiseaseLog.disease_name.isnot(None),
            DiseaseLog.resolved_at.is_(None),
        ).first() is not None
        
        if care_adjustments and not is_healthy and not has_unresolved_disease:
            # Snapshot original values at adjustment time (for safe revert on resolve)
            care_adjustments["original_watering_guide"] = plant.watering_guide
            care_adjustments["original_next_water_date"] = str(plant.next_water_date) if plant.next_water_date else None
            
            # Apply watering adjustments
            if care_adjustments.get("watering_guide"):
                plant.watering_guide = care_adjustments["watering_guide"]
            if care_adjustments.get("watering_frequency_days"):
                adjusted_days = care_adjustments["watering_frequency_days"]
                plant.next_water_date = weather_service.calculate_watering_date(
                    base_days=adjusted_days,
                    temperature=weather_data["temperature"],
                    humidity=weather_data["humidity"],
                    soil_moisture=weather_data["soil_moisture"],
                    rainfall_mm=0,
                )
                next_water_date = plant.next_water_date
            
            logger.info(f"Care adjustments applied to plant {plant_id}: {care_adjustments.get('notes')}")
        
        # Upload to Cloudinary
        secure_url = await run_in_threadpool(
            upload_image, str(file_path), folder=f"flora_mentor/users/{current_user.clerk_id}/plants/{plant_id}"
        )
        
        log_detected_species = ai_detected_species if ai_detected_species != "Unknown" else plant.species
            
        disease_log = DiseaseLog(
            plant_id=plant_id,
            disease_name=disease_name if not is_healthy else None,
            confidence=disease_confidence,
            image_url=secure_url,
            detected_species=log_detected_species,
            env_temperature=weather_data["temperature"],
            env_humidity=weather_data["humidity"],
            soil_moisture=weather_data["soil_moisture"],
            treatment_recommendation=treatment_recommendation,
            care_adjustments=care_adjustments if not is_healthy else None,
            treatment_duration_days=treatment_duration,
            expected_resolve_date=expected_resolve,
            image_hash=image_hash,
            scanned_at=datetime.now()
        )
        db.add(disease_log)
        db.commit()
        db.refresh(disease_log)
        db.refresh(plant)

        return DiseaseScanResponse(
            scan_id=disease_log.id,
            plant_id=plant_id,
            disease_detected=disease_name if not is_healthy else None,
            disease_confidence=disease_confidence,
            env_temperature=weather_data["temperature"],
            env_humidity=weather_data["humidity"],
            soil_moisture=weather_data["soil_moisture"],
            next_water_date=next_water_date,
            image_url=disease_log.image_url,
            scanned_at=disease_log.scanned_at,
            treatment_recommendation=treatment_recommendation if not is_healthy else (
                "Cây của bạn trông rất khỏe mạnh! Hãy tiếp tục chăm sóc tốt nhé. 🌿" if language == "vi"
                else "Your plant looks healthy! Keep up the good care. 🌿"
            ),
            care_adjustments=care_adjustments if not is_healthy else None,
            species_affinity_warning=species_affinity_warning,
        )

    finally:
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete temp file {file_path}: {e}")

@router.get("/plants/{plant_id}/disease-logs", response_model=list[DiseaseLogResponse])
async def get_plant_disease_logs(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all scans/disease logs for a specific plant.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = db.query(DiseaseLog).filter(
        DiseaseLog.plant_id == plant_id
    ).order_by(DiseaseLog.scanned_at.desc()).all()
    
    return logs

@router.get("/disease-logs/{log_id}", response_model=DiseaseLogResponse)
async def get_disease_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific disease log/scan.
    """
    log = db.query(DiseaseLog).filter(DiseaseLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Disease log not found")
    
    plant = log.plant
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return log