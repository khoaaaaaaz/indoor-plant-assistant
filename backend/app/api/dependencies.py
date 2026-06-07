from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.core.security import verify_access_token
from typing import Optional
from app.core.database import get_db
from app.models.user import User
from sqlalchemy.orm import Session

security = HTTPBearer()

# ========== JWT VERIFICATION ==========
async def get_current_user(
    credentials = Depends(security),
    db: Session = Depends()
) -> User:
    """
    WHAT IT DOES: 
    - Extracts JWT token from request header
    - Verifies token is valid
    - Returns the current logged-in user
    
    WHY: Use this in any endpoint that requires authentication
    
    HOW TO USE IN AN ENDPOINT:
    @router.get("/me")
    def get_current_user_info(current_user: User = Depends(get_current_user)):
        return current_user
    
    WHAT HAPPENS:
    1. Client sends: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
    2. This function extracts the token from "Bearer ..."
    3. Verifies token signature + expiration
    4. Looks up user in database by email
    5. Returns the User object
    6. If any step fails, raises 401 Unauthorized
    """
    token = credentials.credentials
    
    # Verify token is valid and get token data
    token_data = verify_access_token(token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Lazy Sync: Look up user in database by clerk_id
    user = db.query(User).filter(User.clerk_id == token_data.sub).first()
    
    # If not found by clerk_id, check by email (backward compatibility) or create new
    if user is None:
        if token_data.email:
            user = db.query(User).filter(User.email == token_data.email).first()
            
        if user:
            # Update existing user with clerk_id
            user.clerk_id = token_data.sub
            db.commit()
            db.refresh(user)
        else:
            # Create new user
            email = token_data.email or f"{token_data.sub}@clerk.placeholder.com"
            user = User(
                email=email,
                clerk_id=token_data.sub,
                hashed_password=None, # Not needed for Clerk
                full_name=email.split("@")[0] # Simple default
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    
    return user


# ========== ADMIN SECURITY GATE ==========
import os

async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    WHAT IT DOES:
    - Dependency that checks if the logged-in user's email is whitelisted in ADMIN_EMAILS
    - Fallback checks if the database user role is explicitly "admin"
    
    WHY: Gated admin-only endpoints for cache verification and system statistics
    
    HOW TO USE:
    @router.get("/admin-route")
    def admin_only(admin: User = Depends(require_admin)):
        return {"message": "Hello admin"}
    """
    admin_emails_str = os.getenv("ADMIN_EMAILS", "")
    admin_emails = {email.strip().lower() for email in admin_emails_str.split(",") if email.strip()}
    
    is_admin = (current_user.email and current_user.email.lower() in admin_emails) or (current_user.role == "admin")
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
        
    return current_user
