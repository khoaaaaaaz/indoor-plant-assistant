# app/schemas/care_history.py
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from enum import Enum


class ActionType(str, Enum):
    """
    Allowed care action types.
    Inherits from `str` so Pydantic serializes to plain string in JSON responses
    (e.g., "water" instead of "ActionType.WATER").
    
    Any request with an action_type not in this list will be rejected
    automatically by FastAPI with a 422 Validation Error.
    """
    WATER = "water"
    MIST = "mist"
    FERTILIZE = "fertilize"
    ROTATE = "rotate"
    PRUNE = "prune"


class CareHistoryCreate(BaseModel):
    """
    WHAT IT DOES: Validates care action data from frontend
    
    Expected JSON from frontend:
    {
        "action_type": "water",
        "notes": "Watered thoroughly, soil was dry"
    }
    
    Note: plant_id comes from the URL path, not the body.
    action_date is auto-set by the database (server_default=func.now()).
    """
    action_type: ActionType
    notes: Optional[str] = None
    task_due_date: Optional[date] = None  # Frontend sends task's scheduled date for server validation


class CareHistoryResponse(BaseModel):
    """
    WHAT IT DOES: Response shape for care history records
    """
    id: int
    plant_id: int
    action_type: str
    action_date: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True
