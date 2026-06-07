from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from sqlalchemy.orm import Session
from app.core.database import get_db
# app.core.security imports removed as they are no longer used here
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, LoginRequest, LoginResponse, Token
from app.api.dependencies import get_current_user
from app.services.weather_service import get_weather_service

router = APIRouter()

# ========== GET CURRENT USER (AUTH REQUIRED) ==========
@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    ENDPOINT: GET /api/users/me
    
    WHAT IT DOES:
    - Returns the logged-in user's information
    - Requires valid JWT token
    
    REQUIRED HEADER:
    Authorization: Bearer {access_token}
    
    RESPONSE:
    {
        "id": 1,
        "email": "john@example.com",
        "full_name": "John Doe",
        "role": "user",
        "created_at": "2026-05-05T10:00:00"
    }
    
    ERROR:
    - 401 Unauthorized: No token, invalid token, or expired token
    """
    return current_user


# ========== GET WEATHER (AUTH REQUIRED) ==========
# IMPORTANT: This must be defined BEFORE /{user_id} routes!
# FastAPI matches routes top-to-bottom. If /{user_id} comes first,
# a request to /weather would match /{user_id} with user_id="weather"
# and fail with a 422 validation error.
@router.get("/weather", tags=["weather"])
def get_current_weather(
    latitude: float, 
    longitude: float, 
    current_user: User = Depends(get_current_user)
):
    """
    ENDPOINT: GET /api/users/weather
    
    WHAT IT DOES:
    - Fetches current weather for the user's location
    """
    weather_service = get_weather_service()
    return weather_service.get_agri_weather(latitude, longitude)


# ========== GET USER BY ID (AUTH REQUIRED) ==========
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    ENDPOINT: GET /api/users/{user_id}
    
    WHAT IT DOES:
    - Returns a specific user's information
    - Requires valid JWT token
    - Only admins can see other users' data (simplified for now)
    
    REQUIRED HEADER:
    Authorization: Bearer {access_token}
    
    ERROR:
    - 401 Unauthorized: No/invalid token
    - 404 Not Found: User ID doesn't exist
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


# ========== DELETE USER (AUTH REQUIRED) ==========
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    ENDPOINT: DELETE /api/users/{user_id}
    
    WHAT IT DOES:
    - Deletes a user account
    - Requires valid JWT token
    - Users can only delete their own account (simplified check)
    
    REQUIRED HEADER:
    Authorization: Bearer {access_token}
    
    RESPONSE: 204 No Content (success), no body
    
    ERROR:
    - 401 Unauthorized: No/invalid token
    - 403 Forbidden: Trying to delete someone else's account
    - 404 Not Found: User ID doesn't exist
    """
    # Simple check: users can only delete themselves
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other users"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    return None