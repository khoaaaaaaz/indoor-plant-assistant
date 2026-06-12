import os
import logging
from datetime import datetime, timedelta
from typing import Optional
import jwt
from jwt import PyJWKClient
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ============ CLERK JWT TOKEN HANDLING ============

class TokenData(BaseModel):
    """
    Data extracted from a Clerk JWT token.
    'sub' is the Clerk User ID.
    """
    sub: str
    email: Optional[str] = None

# Cache for the JWK client to avoid fetching JWKS on every request
_jwk_clients = {}

def verify_access_token(token: str) -> Optional[TokenData]:
    """
    Verifies a Clerk JWT token using PyJWKClient.
    Extracts the Clerk user ID (sub) and optional email.
    """
    try:
        # First decode unverified to get the issuer (iss)
        unverified_header = jwt.get_unverified_header(token)
        unverified_claims = jwt.decode(token, options={"verify_signature": False})
        
        issuer = unverified_claims.get("iss")
        if not issuer:
            return None
            
        # Initialize or get JWK client for this issuer
        if issuer not in _jwk_clients:
            jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
            _jwk_clients[issuer] = PyJWKClient(jwks_url)
            
        jwk_client = _jwk_clients[issuer]
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        
        # Verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False}, # Clerk tokens often don't have standard aud unless configured
            leeway=60 # Allow 60 seconds for clock skew between Clerk servers and Docker container
        )
        
        sub = payload.get("sub")
        if not sub:
            return None
            
        # Email might not be in standard Clerk tokens unless configured in JWT templates.
        # But we capture it if it's there.
        email = payload.get("email") or payload.get("primary_email_address")
            
        return TokenData(sub=sub, email=email)
        
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None