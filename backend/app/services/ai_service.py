# app/services/ai_service.py
"""
AI Service for Plant Disease Detection and Species Identification

This service loads pre-trained TensorFlow/Keras models and performs inference.

Models Expected:
- species_model_production.keras  (MobileNetV2 fine-tuned, 46 classes)
- pathology_model_production.keras (MobileNetV2 fine-tuned, 14 classes)

From: Kaggle notebooks (trained by user separately)

Usage:
    service = AIService()
    species, confidence = service.identify_species(image_path)
    result = service.diagnose_disease(image_path)
"""

import os
import numpy as np
from typing import Optional, Tuple, Dict, Any
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Model paths
MODELS_DIR = Path(__file__).parent.parent / "ai"
SPECIES_MODEL_PATH = MODELS_DIR / "species_model_production.keras"
DISEASE_MODEL_PATH = MODELS_DIR / "pathology_model_production.keras"

# Image preprocessing constants
IMAGE_SIZE = 224
BATCH_SIZE = 1

# ============================================================
# Species Classification: 46 classes
# Trained with image_dataset_from_directory which sorts
# class names ALPHABETICALLY. Order must match exactly.
# ============================================================
SPECIES_CLASSES = [
    "African",
    "Aloe",
    "Anthurium",
    "Areca",
    "Asparagus",
    "Begonia",
    "Bird",
    "Birds",
    "Boston",
    "Calathea",
    "Cast",
    "Chinese",
    "Christmas",
    "Chrysanthemum",
    "Ctenanthe",
    "Daffodils",
    "Dracaena",
    "Dumb",
    "Elephant",
    "English",
    "Hyacinth",
    "Iron",
    "Jade",
    "Kalanchoe",
    "Lilium",
    "Lily",
    "Money",
    "Monstera",
    "Orchid",
    "Parlor",
    "Peace",
    "Poinsettia",
    "Polka",
    "Ponytail",
    "Pothos",
    "Prayer",
    "Rattlesnake",
    "Rubber",
    "Sago",
    "Schefflera",
    "Snake",
    "Tradescantia",
    "Tulip",
    "Venus",
    "Yucca",
    "ZZ",
]

# Human-readable display names for each species class key
SPECIES_DISPLAY_NAMES = {
    "African": "African Violet",
    "Aloe": "Aloe Vera",
    "Anthurium": "Anthurium",
    "Areca": "Areca Palm",
    "Asparagus": "Asparagus Fern",
    "Begonia": "Begonia",
    "Bird": "Bird of Paradise",
    "Birds": "Bird's Nest Fern",
    "Boston": "Boston Fern",
    "Calathea": "Calathea",
    "Cast": "Cast Iron Plant",
    "Chinese": "Chinese Evergreen",
    "Christmas": "Christmas Cactus",
    "Chrysanthemum": "Chrysanthemum",
    "Ctenanthe": "Ctenanthe",
    "Daffodils": "Daffodils",
    "Dracaena": "Dracaena",
    "Dumb": "Dumb Cane (Dieffenbachia)",
    "Elephant": "Elephant Ear",
    "English": "English Ivy",
    "Hyacinth": "Hyacinth",
    "Iron": "Iron Cross Begonia",
    "Jade": "Jade Plant",
    "Kalanchoe": "Kalanchoe",
    "Lilium": "Lilium",
    "Lily": "Lily",
    "Money": "Money Plant (Pothos)",
    "Monstera": "Monstera Deliciosa",
    "Orchid": "Orchid",
    "Parlor": "Parlor Palm",
    "Peace": "Peace Lily",
    "Poinsettia": "Poinsettia",
    "Polka": "Polka Dot Plant",
    "Ponytail": "Ponytail Palm",
    "Pothos": "Pothos (Golden)",
    "Prayer": "Prayer Plant",
    "Rattlesnake": "Rattlesnake Plant",
    "Rubber": "Rubber Plant",
    "Sago": "Sago Palm",
    "Schefflera": "Schefflera",
    "Snake": "Snake Plant (Sansevieria)",
    "Tradescantia": "Tradescantia",
    "Tulip": "Tulip",
    "Venus": "Venus Flytrap",
    "Yucca": "Yucca",
    "ZZ": "ZZ Plant",
}

# ============================================================
# Disease Detection (Pathology): 14 classes
# Covers 4 target plants with their specific conditions.
# Sorted alphabetically (TensorFlow convention).
# ============================================================
DISEASE_CLASSES = [
    "Aloe_Anthracnose",
    "Aloe_Healthy",
    "Aloe_LeafSpot",
    "Aloe_Rust",
    "Aloe_Sunburn",
    "Money_Plant_Bacterial_wilt_disease",
    "Money_Plant_Healthy",
    "Money_Plant_Manganese_Toxicity",
    "Snake_Plant_Anthracnose",
    "Snake_Plant_Healthy",
    "Snake_Plant_Leaf_Withering",
    "Spider_Plant_Fungal_leaf_spot",
    "Spider_Plant_Healthy",
    "Spider_Plant_Leaf_Tip_Necrosis",
]

# Mapping from raw class label → (species_display_name, disease_display_name)
# disease_display_name is None for healthy states
DISEASE_CLASS_INFO: Dict[str, Dict[str, Any]] = {
    "Aloe_Anthracnose":                    {"species": "Aloe Vera",     "disease": "Anthracnose",              "is_healthy": False},
    "Aloe_Healthy":                        {"species": "Aloe Vera",     "disease": None,                       "is_healthy": True},
    "Aloe_LeafSpot":                       {"species": "Aloe Vera",     "disease": "Leaf Spot",                "is_healthy": False},
    "Aloe_Rust":                           {"species": "Aloe Vera",     "disease": "Rust",                     "is_healthy": False},
    "Aloe_Sunburn":                        {"species": "Aloe Vera",     "disease": "Sunburn",                  "is_healthy": False},
    "Money_Plant_Bacterial_wilt_disease":   {"species": "Money Plant",   "disease": "Bacterial Wilt Disease",   "is_healthy": False},
    "Money_Plant_Healthy":                 {"species": "Money Plant",   "disease": None,                       "is_healthy": True},
    "Money_Plant_Manganese_Toxicity":      {"species": "Money Plant",   "disease": "Manganese Toxicity",       "is_healthy": False},
    "Snake_Plant_Anthracnose":             {"species": "Snake Plant",   "disease": "Anthracnose",              "is_healthy": False},
    "Snake_Plant_Healthy":                 {"species": "Snake Plant",   "disease": None,                       "is_healthy": True},
    "Snake_Plant_Leaf_Withering":          {"species": "Snake Plant",   "disease": "Leaf Withering",           "is_healthy": False},
    "Spider_Plant_Fungal_leaf_spot":       {"species": "Spider Plant",  "disease": "Fungal Leaf Spot",         "is_healthy": False},
    "Spider_Plant_Healthy":                {"species": "Spider Plant",  "disease": None,                       "is_healthy": True},
    "Spider_Plant_Leaf_Tip_Necrosis":      {"species": "Spider Plant",  "disease": "Leaf Tip Necrosis",        "is_healthy": False},
}


class AIService:
    """
    AI Service for plant disease detection and species identification.
    
    Uses TensorFlow/Keras models trained on plant images.
    Models are loaded once on initialization for efficiency.
    """
    
    def __init__(
        self,
        species_model_path: Optional[Path] = None,
        disease_model_path: Optional[Path] = None,
    ):
        """
        Initialize AI service with model paths.
        
        Args:
            species_model_path: Path to species identification model
            disease_model_path: Path to disease diagnosis model
        """
        self.species_model_path = species_model_path or SPECIES_MODEL_PATH
        self.disease_model_path = disease_model_path or DISEASE_MODEL_PATH
        
        self.species_model = None
        self.disease_model = None
        self.species_model_loaded = False
        self.disease_model_loaded = False
        
        # Models are loaded lazily on demand to optimize container memory & reload performance
    
    def load_species_model(self) -> None:
        """
        Load species identification model if not already loaded.
        """
        if self.species_model_loaded and self.species_model is not None:
            return
            
        try:
            import tensorflow as tf
            
            if not self.species_model_path.exists():
                logger.warning(f"Species model not found at {self.species_model_path}")
                logger.info("Train the species model in Kaggle and place species_model_production.keras in backend/app/ai/")
            else:
                logger.info(f"Loading species model from {self.species_model_path}")
                self.species_model = tf.keras.models.load_model(self.species_model_path)
                
                # Validate output shape
                expected_species = len(SPECIES_CLASSES)
                actual_species = self.species_model.output_shape[-1]
                if actual_species != expected_species:
                    logger.error(
                        f"Species model output mismatch! Model has {actual_species} classes, "
                        f"but SPECIES_CLASSES has {expected_species}. Disabling species model."
                    )
                    self.species_model = None
                else:
                    self.species_model_loaded = True
                    logger.info(f"✅ Species model loaded successfully ({actual_species} classes)")
        except ImportError:
            logger.warning("TensorFlow not installed. AI features disabled.")
            logger.info("Install with: pip install tensorflow")
        except Exception as e:
            logger.error(f"Error loading Species model: {e}")

    def load_disease_model(self) -> None:
        """
        Load disease diagnosis model if not already loaded.
        """
        if self.disease_model_loaded and self.disease_model is not None:
            return
            
        try:
            import tensorflow as tf
            
            if not self.disease_model_path.exists():
                logger.warning(f"Disease model not found at {self.disease_model_path}")
                logger.info("Train the pathology model in Kaggle and place pathology_model_production.keras in backend/app/ai/")
            else:
                logger.info(f"Loading disease model from {self.disease_model_path}")
                self.disease_model = tf.keras.models.load_model(self.disease_model_path)
                
                # Validate output shape
                expected_diseases = len(DISEASE_CLASSES)
                actual_diseases = self.disease_model.output_shape[-1]
                if actual_diseases != expected_diseases:
                    logger.error(
                        f"Disease model output mismatch! Model has {actual_diseases} classes, "
                        f"but DISEASE_CLASSES has {expected_diseases}. Disabling disease model."
                    )
                    self.disease_model = None
                else:
                    self.disease_model_loaded = True
                    logger.info(f"✅ Disease model loaded successfully ({actual_diseases} classes)")
        except ImportError:
            logger.warning("TensorFlow not installed. AI features disabled.")
            logger.info("Install with: pip install tensorflow")
        except Exception as e:
            logger.error(f"Error loading Disease model: {e}")
    
    def warmup_models(self) -> None:
        """
        Perform a dummy prediction on loaded models to warm up TensorFlow/Keras runtime.
        This pre-allocates execution graphs and prevents first-request latency.
        """
        if not self.species_model_loaded and not self.disease_model_loaded:
            logger.warning("No AI models are loaded. Skipping warmup.")
            return

        try:
            import tensorflow as tf
            import time
            
            logger.info("Initializing AI model warmup routine...")
            dummy_input = np.zeros((1, IMAGE_SIZE, IMAGE_SIZE, 3), dtype=np.float32)
            
            if self.species_model_loaded and self.species_model is not None:
                start = time.perf_counter()
                self.species_model.predict(dummy_input, verbose=0)
                logger.info(f"✅ Species model warmed up in {time.perf_counter() - start:.4f}s")
                
            if self.disease_model_loaded and self.disease_model is not None:
                start = time.perf_counter()
                self.disease_model.predict(dummy_input, verbose=0)
                logger.info(f"✅ Disease model warmed up in {time.perf_counter() - start:.4f}s")
                
            logger.info("AI model warmup routine completed successfully.")
        except Exception as e:
            logger.error(f"Error during AI model warmup: {e}")
            
    def preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        Preprocess image for model inference.
        
        Steps:
        1. Load image
        2. Resize to 224x224
        3. Convert to float32 (no /255 — model has built-in Rescaling layer)
        4. Add batch dimension
        
        Args:
            image_path: Path to image file (jpg, png)
            
        Returns:
            Preprocessed numpy array or None if error
        """
        try:
            # Check if image file exists
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return None
            
            # Import here to avoid dependency if not needed
            from PIL import Image
            
            # Load and resize image
            img = Image.open(image_path).convert("RGB")
            img = img.resize((IMAGE_SIZE, IMAGE_SIZE))
            
            # Convert to numpy array (Model has built-in preprocessing layer, no need to divide by 255)
            img_array = np.array(img, dtype="float32")
            
            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)
            
            logger.debug(f"Image preprocessed: shape={img_array.shape}")
            return img_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return None
    
    def identify_species(self, image_path: str) -> Tuple[str, float]:
        """
        Identify plant species from image.
        
        Uses the 46-class MobileNetV2 species classification model.
        
        Args:
            image_path: Path to plant image
            
        Returns:
            Tuple of (species_display_name, confidence_score)
            
        Example:
            species, confidence = service.identify_species("leaf.jpg")
            # Returns: ("Monstera Deliciosa", 0.92)
        """
        self.load_species_model()
        if not self.species_model_loaded or self.species_model is None:
            logger.warning("Species model not available. Using demo mode.")
            return "Unknown Species (Model not loaded)", 0.0
        
        try:
            import time
            
            # Preprocess image
            prep_start = time.perf_counter()
            img_array = self.preprocess_image(image_path)
            if img_array is None:
                return "Error: Could not process image", 0.0
            prep_duration = time.perf_counter() - prep_start
            
            # Run prediction
            predict_start = time.perf_counter()
            predictions = self.species_model.predict(img_array, verbose=0)
            predict_duration = time.perf_counter() - predict_start
            
            confidence = float(np.max(predictions))
            predicted_class = int(np.argmax(predictions))
            
            # Map class index to display name
            if predicted_class < len(SPECIES_CLASSES):
                class_key = SPECIES_CLASSES[predicted_class]
                species_name = SPECIES_DISPLAY_NAMES.get(class_key, class_key)
            else:
                species_name = f"Species #{predicted_class}"
            
            logger.info(
                f"Species identified: {species_name} (confidence: {confidence:.2%}). "
                f"Perf metrics: preprocess={prep_duration:.4f}s, inference={predict_duration:.4f}s, total={prep_duration+predict_duration:.4f}s"
            )
            return species_name, confidence
            
        except Exception as e:
            logger.error(f"Error identifying species: {e}")
            return "Error: Could not identify species", 0.0
    
    def diagnose_disease(self, image_path: str) -> Dict[str, Any]:
        """
        Diagnose plant disease from image.
        
        Uses the 14-class MobileNetV2 pathology model.
        The model predicts both the plant species and its health condition
        in a single classification (e.g., "Aloe_Anthracnose").
        
        Args:
            image_path: Path to plant image
            
        Returns:
            Dictionary with keys:
            - disease_name: str or None (None if healthy)
            - confidence: float
            - is_healthy: bool
            - detected_species: str (species identified by pathology model)
            - raw_class: str (raw class label)
            
        Example:
            result = service.diagnose_disease("leaf.jpg")
            # Returns: {"disease_name": "Anthracnose", "confidence": 0.87,
            #           "is_healthy": False, "detected_species": "Aloe Vera",
            #           "raw_class": "Aloe_Anthracnose"}
            # Or for healthy: {"disease_name": None, "confidence": 0.92,
            #                  "is_healthy": True, "detected_species": "Snake Plant",
            #                  "raw_class": "Snake_Plant_Healthy"}
        """
        self.load_disease_model()
        if not self.disease_model_loaded or self.disease_model is None:
            logger.warning("Disease model not available. Using demo mode.")
            return {
                "disease_name": None,
                "confidence": 0.0,
                "is_healthy": True,
                "detected_species": "Unknown",
                "raw_class": None,
            }
        
        try:
            import time
            
            # Preprocess image
            prep_start = time.perf_counter()
            img_array = self.preprocess_image(image_path)
            if img_array is None:
                return {
                    "disease_name": None,
                    "confidence": 0.0,
                    "is_healthy": True,
                    "detected_species": "Unknown",
                    "raw_class": None,
                }
            prep_duration = time.perf_counter() - prep_start
            
            # Run prediction
            predict_start = time.perf_counter()
            predictions = self.disease_model.predict(img_array, verbose=0)
            predict_duration = time.perf_counter() - predict_start
            
            confidence = float(np.max(predictions))
            predicted_class = int(np.argmax(predictions))
            
            # Map class index to info
            if predicted_class < len(DISEASE_CLASSES):
                raw_class = DISEASE_CLASSES[predicted_class]
                class_info = DISEASE_CLASS_INFO.get(raw_class, {})
                
                disease_name = class_info.get("disease", None)
                is_healthy = class_info.get("is_healthy", False)
                detected_species = class_info.get("species", "Unknown")
            else:
                raw_class = f"Disease #{predicted_class}"
                disease_name = raw_class
                is_healthy = False
                detected_species = "Unknown"
            
            logger.info(
                f"Disease scan: class={raw_class}, species={detected_species}, disease={disease_name}, healthy={is_healthy} (confidence: {confidence:.2%}). "
                f"Perf metrics: preprocess={prep_duration:.4f}s, inference={predict_duration:.4f}s, total={prep_duration+predict_duration:.4f}s"
            )
            
            return {
                "disease_name": disease_name,
                "confidence": confidence,
                "is_healthy": is_healthy,
                "detected_species": detected_species,
                "raw_class": raw_class,
            }
            
        except Exception as e:
            logger.error(f"Error diagnosing disease: {e}")
            return {
                "disease_name": None,
                "confidence": 0.0,
                "is_healthy": True,
                "detected_species": "Unknown",
                "raw_class": None,
            }


# Singleton instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get or create AI service singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
