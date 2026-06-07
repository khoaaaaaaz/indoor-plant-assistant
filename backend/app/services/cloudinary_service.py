import os
import cloudinary
import cloudinary.uploader
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Note: Cloudinary auto-configures if CLOUDINARY_URL is set. 
# Alternatively, configure explicitly using individual keys.
def _configure():
    # Only configure if we have keys
    if os.getenv("CLOUDINARY_CLOUD_NAME"):
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True
        )

def upload_image(file_path: str, folder: str = "flora_mentor") -> Optional[str]:
    """Uploads an image to Cloudinary and returns the secure URL."""
    _configure()
    try:
        if not os.getenv("CLOUDINARY_CLOUD_NAME") and not os.getenv("CLOUDINARY_URL"):
            logger.warning("Cloudinary not configured. Skipping upload.")
            return None
            
        response = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="image"
        )
        return response.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return None
