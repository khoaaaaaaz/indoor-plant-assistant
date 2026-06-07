import os
# Suppress noisy TensorFlow startup warnings and oneDNN info logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from app.core.database import engine, Base

logger = logging.getLogger(__name__)

# Import Models (so they're registered with SQLAlchemy)
from app.models.user import User
from app.models.plant import Plant
from app.models.disease_log import DiseaseLog
from app.models.care_history import CareHistory

# Import Routers
from app.api.endpoints import users, plants, scan, disease_logs, care_history, explore, admin

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Only preload models if explicitly configured to do so (useful for production, but not recommended for dev reload)
    preload = os.getenv("PRELOAD_AI_MODELS", "false").lower() == "true"
    if preload:
        logger.info("Starting up: Preloading AI models and running warmups...")
        try:
            from app.services.ai_service import get_ai_service
            ai_service = get_ai_service()
            # Explicitly trigger loading in lazy-load setup
            ai_service.load_species_model()
            ai_service.load_disease_model()
            ai_service.warmup_models()
        except Exception as e:
            logger.error(f"Failed to preload/warmup AI models during lifespan boot: {e}")
    else:
        logger.info("Starting up: AI model lazy-loading enabled (will load models on-demand on first scan).")
    yield
    logger.info("Shutting down: Releasing resources...")

app = FastAPI(
    title="Indoor Plant Assistant API",
    description="Backend architecture using Router-Service-Model pattern.",
    version="1.0.0",
    lifespan=lifespan
)

# ========== CORS CONFIGURATION ==========
# WHAT IT DOES: Allows frontend (React) to call backend from different URL
# WHY: Frontend runs on http://localhost:3000, backend on http://localhost:8000
# Without CORS, browsers block cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",  # Vite preview port
    ],
    allow_origin_regex=r"https://.*\.ngrok-free\.(app|dev)",  # Allow all secure ngrok tunnels (.app and .dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect the routers to the main app
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(plants.router, prefix="/api/plants", tags=["Plants"])
app.include_router(scan.router)
app.include_router(disease_logs.router)
app.include_router(care_history.router, prefix="/api/plants", tags=["Care History"])
app.include_router(explore.router)
app.include_router(admin.router)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
@app.get("/health")
def health_check():
    # Trigger hot-reload test to verify uvicorn reload loop stability
    return {
        "status": "healthy",
        "architecture": "layered",
        "db_connected": True,
        "auth_enabled": True
    }