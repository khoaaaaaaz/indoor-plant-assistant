from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# ========== REGISTRATION ==========
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str  # Plain password (will be hashed in the endpoint)

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ========== LOGIN ==========
class LoginRequest(BaseModel):
    """
    WHAT IT DOES: Validates login form data
    
    Expected JSON from frontend:
    {
        "email": "john@example.com",
        "password": "mypassword123"
    }
    """
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    """
    WHAT IT DOES: Response after successful login
    
    Frontend gets back:
    {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "bearer",
        "user": { "id": 1, "email": "john@example.com", ... }
    }
    """
    access_token: str
    token_type: str
    user: UserResponse


# ========== TOKEN ==========
class Token(BaseModel):
    """
    WHAT IT DOES: Simple token response for other endpoints
    """
    access_token: str
    token_type: str