# app/main.py
from fastapi import FastAPI
from app.core.database import engine, Base

from app.models.user import User
from app.models.plant import Plant
from app.models.disease_log import DiseaseLog
from app.models.care_history import CareHistory

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Indoor Plant Assistant API",
    description="Backend architecture using Router-Service-Model pattern.",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "architecture": "layered", "db_connected": True}