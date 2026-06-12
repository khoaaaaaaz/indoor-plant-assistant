from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Plant(Base):
  __tablename__ = "plants"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  name = Column(String)
  species = Column(String)
  next_water_date = Column(Date)
  
  # Week 3: Botanical data from Perenual API
  sunlight_requirement = Column(String, nullable=True)  # e.g., "Bright indirect light, Partial shade"
  watering_guide = Column(String, nullable=True)  # e.g., "Frequent", "Average", "Minimum"
  care_level = Column(String, nullable=True)  # e.g., "Low", "Medium", "High"
  is_toxic_to_pets = Column(Boolean, default=False)  # Safety warning for pet owners
  image_url = Column(String, nullable=True)  # Profile photo from Cloudinary
  
  # Week 4: Extended botanical data (JSON blob for display-only fields)
  # Contains: family, origin, type, drought_tolerant, maintenance,
  #   poisonous_to_humans, medicinal, indoor, tropical, rare, flowers,
  #   soil, propagation, pest_susceptibility, pruning_month, description
  botanical_data = Column(JSON, nullable=True)
  
  created_at = Column(DateTime(timezone=True), server_default=func.now())
  updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

  owner = relationship("User", back_populates="plants")
  disease_logs = relationship("DiseaseLog", back_populates="plant", cascade="all, delete-orphan", lazy="selectin")
  care_history = relationship("CareHistory", back_populates="plant", cascade="all, delete-orphan")

  @property
  def has_active_disease(self) -> bool:
      return any(log.disease_name is not None and log.resolved_at is None for log in self.disease_logs)