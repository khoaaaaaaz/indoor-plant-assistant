# app/services/perenual_api_service.py
"""
Perenual API Service - Fetch botanical plant data

Free API: https://perenual.com/api
Documentation: https://perenual.com/api/documentation

Usage:
    service = PerenualService(api_key="your_key")
    care_info = service.fetch_plant_care_info("Monstera deliciosa")
"""

import os
import requests
import httpx
from typing import Optional, Dict, Any
from functools import lru_cache
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

PERENUAL_API_KEY = os.getenv("PERENUAL_API_KEY", "")
PERENUAL_BASE_URL = "https://perenual.com/api"
CACHE_DURATION = 3600 * 24  # Cache for 24 hours

# ─── Static Species Cache ─────────────────────────────────────
# Loaded once at app startup from species_data.json.
# Provides instant botanical data for all 46 species our AI model
# recognizes, skipping both Perenual API and Gemini LLM calls.
_SPECIES_CACHE_FILE = Path(__file__).parent.parent / "constants" / "species_data.json"


def _load_species_cache() -> dict:
    """Load species care data from static JSON. Returns {} if file missing."""
    try:
        if _SPECIES_CACHE_FILE.exists():
            with open(_SPECIES_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info(f"✅ Species cache loaded: {len(data)} species from {_SPECIES_CACHE_FILE.name}")
                return data
    except Exception as e:
        logger.warning(f"Could not load species cache: {e}")
    return {}


_SPECIES_CACHE: dict = _load_species_cache()


def parse_watering_to_days(watering_text: str) -> int:
    """
    Convert Perenual watering text to days for scheduling.
    
    Examples:
        "Frequent" → 3 days
        "Average" → 7 days
        "Minimum" → 14 days
        "Twice a week" → 3 days
        "Once a week" → 7 days
    
    Args:
        watering_text: Watering frequency from Perenual API (e.g., "Frequent", "Average")
        
    Returns:
        Integer days between watering (default 7 if unknown)
    """
    if not watering_text:
        return 7  # Default to 7 days
    
    watering_lower = watering_text.lower()
    
    # Map common watering terms to days
    watering_map = {
        "frequent": 3,
        "often": 3,
        "daily": 1,
        "every day": 1,
        "twice a week": 3,
        "2x": 3,
        "every few days": 3,
        
        "average": 7,
        "moderate": 7,
        "weekly": 7,
        "once a week": 7,
        "1x": 7,
        "regularly": 7,
        
        "minimal": 14,
        "minimum": 14,
        "rarely": 14,
        "low": 14,
        "sparse": 14,
        "once every 2 weeks": 14,
        "every 2 weeks": 14,
        "2-3 weeks": 14,
        
        "never": 30,
        "drought tolerant": 21,
        "semi-drought tolerant": 14,
    }
    
    # Check for exact matches
    for key, days in watering_map.items():
        if key in watering_lower:
            return days
    
    # Default to 7 days if no match
    logger.warning(f"Unknown watering frequency: {watering_text}. Defaulting to 7 days.")
    return 7


# ─── Curated Fallback Data ─────────────────────────────────
# Covers the key indoor plants our AI model recognizes.
# Used when Perenual API is unavailable (paywall, rate limit, no key).
# Data sourced from reliable botanical references.
#
KNOWN_PLANT_CARE: Dict[str, Dict[str, Any]] = {
    "Aloe Vera": {
        "watering_frequency_days": 14,
        "watering_guide": "Minimum",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Succulent plant known for its medicinal gel.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Asphodelaceae", "origin": ["Mediterranean"], "type": "Herb",
            "drought_tolerant": True, "maintenance": "Low", "poisonous_to_humans": False,
            "medicinal": True, "indoor": True, "tropical": False, "rare": False,
            "flowers": True, "soil": ["Well-drained"], "propagation": ["Division"],
            "pest_susceptibility": ["Mealybugs", "Root rot", "Scale insects"],
            "pruning_month": ["March", "April"], "description": "Succulent plant known for its medicinal gel.",
        },
    },
    "Monstera": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Tropical vine with distinctive split leaves.",
        "cycle": "Perennial",
        "growth_rate": "Fast",
        "botanical_data": {
            "family": "Araceae", "origin": ["Central America"], "type": "Vine",
            "drought_tolerant": False, "maintenance": "Low", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Well-drained", "Peat-based"], "propagation": ["Cutting", "Division"],
            "pest_susceptibility": ["Mealybugs", "Spider mites"],
            "pruning_month": [], "description": "Tropical vine with distinctive split leaves.",
        },
    },
    "Snake Plant": {
        "watering_frequency_days": 14,
        "watering_guide": "Minimum",
        "sunlight_requirement": "Low light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Hardy succulent with stiff, upright leaves.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Asparagaceae", "origin": ["West Africa"], "type": "Succulent",
            "drought_tolerant": True, "maintenance": "Low", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": True, "soil": ["Sandy", "Well-drained"], "propagation": ["Division", "Leaf cutting"],
            "pest_susceptibility": ["Root rot"], "pruning_month": [],
            "description": "Hardy succulent with stiff, upright leaves.",
        },
    },
    "Pothos": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Low light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Trailing vine, excellent air purifier.",
        "cycle": "Perennial",
        "growth_rate": "Fast",
        "botanical_data": {
            "family": "Araceae", "origin": ["Southeast Asia"], "type": "Vine",
            "drought_tolerant": False, "maintenance": "Low", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Well-drained"], "propagation": ["Cutting"],
            "pest_susceptibility": ["Mealybugs", "Root rot"], "pruning_month": [],
            "description": "Trailing vine, excellent air purifier.",
        },
    },
    "Money Plant": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Easy-care trailing vine, also known as Pothos.",
        "cycle": "Perennial",
        "growth_rate": "Fast",
        "botanical_data": {
            "family": "Araceae", "origin": ["Southeast Asia"], "type": "Vine",
            "drought_tolerant": False, "maintenance": "Low", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Well-drained"], "propagation": ["Cutting"],
            "pest_susceptibility": ["Mealybugs", "Root rot"], "pruning_month": [],
            "description": "Easy-care trailing vine, also known as Pothos.",
        },
    },
    "Spider Plant": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Low",
        "is_toxic_to_pets": False,
        "description": "Air-purifying plant with arching leaves and baby plantlets.",
        "cycle": "Perennial",
        "growth_rate": "Fast",
        "botanical_data": {
            "family": "Asparagaceae", "origin": ["South Africa"], "type": "Herb",
            "drought_tolerant": True, "maintenance": "Low", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": False, "rare": False,
            "flowers": True, "soil": ["Well-drained", "Loamy"], "propagation": ["Division", "Plantlets"],
            "pest_susceptibility": ["Spider mites", "Scale insects"], "pruning_month": [],
            "description": "Air-purifying plant with arching leaves and baby plantlets.",
        },
    },
    "Peace Lily": {
        "watering_frequency_days": 7,
        "watering_guide": "Frequent",
        "sunlight_requirement": "Low light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Flowering plant that thrives in shade.",
        "cycle": "Perennial",
        "growth_rate": "Medium",
        "botanical_data": {
            "family": "Araceae", "origin": ["Central America"], "type": "Herb",
            "drought_tolerant": False, "maintenance": "Low", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": True, "soil": ["Moist", "Well-drained"], "propagation": ["Division"],
            "pest_susceptibility": ["Mealybugs", "Aphids"], "pruning_month": [],
            "description": "Flowering plant that thrives in shade.",
        },
    },
    "Rubber Plant": {
        "watering_frequency_days": 10,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Tree-like houseplant with thick, glossy leaves.",
        "cycle": "Perennial",
        "growth_rate": "Medium",
        "botanical_data": {
            "family": "Moraceae", "origin": ["Southeast Asia"], "type": "Tree",
            "drought_tolerant": False, "maintenance": "Low", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Well-drained", "Loamy"], "propagation": ["Cutting"],
            "pest_susceptibility": ["Mealybugs", "Scale insects"], "pruning_month": ["Spring"],
            "description": "Tree-like houseplant with thick, glossy leaves.",
        },
    },
    "ZZ Plant": {
        "watering_frequency_days": 14,
        "watering_guide": "Minimum",
        "sunlight_requirement": "Low light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Extremely drought-tolerant with waxy, dark green leaves.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Araceae", "origin": ["East Africa"], "type": "Herb",
            "drought_tolerant": True, "maintenance": "Low", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "soil": ["Well-drained", "Sandy"], "propagation": ["Division", "Leaf cutting"],
            "pest_susceptibility": [], "pruning_month": [],
            "description": "Extremely drought-tolerant with waxy, dark green leaves.",
        },
    },
    "Orchid": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Medium",
        "is_toxic_to_pets": False,
        "description": "Elegant flowering plant with long-lasting blooms.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Orchidaceae", "origin": ["Tropical regions"], "type": "Epiphyte",
            "drought_tolerant": False, "maintenance": "Medium", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": True, "soil": ["Bark mix", "Sphagnum moss"], "propagation": ["Division"],
            "pest_susceptibility": ["Mealybugs", "Scale insects", "Root rot"],
            "pruning_month": [], "description": "Elegant flowering plant with long-lasting blooms.",
        },
    },
    "Jade Plant": {
        "watering_frequency_days": 14,
        "watering_guide": "Minimum",
        "sunlight_requirement": "Full sun",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Succulent with thick, woody stems and oval leaves.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Crassulaceae", "origin": ["South Africa"], "type": "Succulent",
            "drought_tolerant": True, "maintenance": "Low", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": False, "rare": False,
            "flowers": True, "soil": ["Sandy", "Well-drained"], "propagation": ["Leaf cutting", "Stem cutting"],
            "pest_susceptibility": ["Mealybugs", "Root rot"], "pruning_month": [],
            "description": "Succulent with thick, woody stems and oval leaves.",
        },
    },
    "Calathea": {
        "watering_frequency_days": 5,
        "watering_guide": "Frequent",
        "sunlight_requirement": "Partial shade",
        "care_level": "High",
        "is_toxic_to_pets": False,
        "description": "Tropical plant with strikingly patterned leaves.",
        "cycle": "Perennial",
        "growth_rate": "Medium",
        "botanical_data": {
            "family": "Marantaceae", "origin": ["South America"], "type": "Herb",
            "drought_tolerant": False, "maintenance": "High", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Moist", "Peat-based"], "propagation": ["Division"],
            "pest_susceptibility": ["Spider mites", "Root rot"], "pruning_month": [],
            "description": "Tropical plant with strikingly patterned leaves.",
        },
    },
    "Boston Fern": {
        "watering_frequency_days": 3,
        "watering_guide": "Frequent",
        "sunlight_requirement": "Partial shade",
        "care_level": "Medium",
        "is_toxic_to_pets": False,
        "description": "Lush fern with arching, feathery fronds.",
        "cycle": "Perennial",
        "growth_rate": "Fast",
        "botanical_data": {
            "family": "Nephrolepidaceae", "origin": ["Americas"], "type": "Fern",
            "drought_tolerant": False, "maintenance": "Medium", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Moist", "Peat-based"],
            "propagation": ["Division"], "pest_susceptibility": ["Scale insects"],
            "pruning_month": [],
            "description": "Lush fern with arching, feathery fronds.",
        },
    },
    "Dracaena": {
        "watering_frequency_days": 10,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Tree-like plant with sword-shaped leaves.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Asparagaceae", "origin": ["Africa"], "type": "Tree",
            "drought_tolerant": True, "maintenance": "Low", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": False, "soil": ["Well-drained", "Loamy"], "propagation": ["Cutting"],
            "pest_susceptibility": ["Mealybugs", "Spider mites"], "pruning_month": [],
            "description": "Tree-like plant with sword-shaped leaves.",
        },
    },
    "Begonia": {
        "watering_frequency_days": 5,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Medium",
        "is_toxic_to_pets": True,
        "description": "Colorful foliage or flowering plant for indoor growing.",
        "cycle": "Perennial",
        "growth_rate": "Medium",
        "botanical_data": {
            "family": "Begoniaceae", "origin": ["Tropical regions"], "type": "Herb",
            "drought_tolerant": False, "maintenance": "Medium", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": True, "soil": ["Moist", "Well-drained"], "propagation": ["Cutting", "Division"],
            "pest_susceptibility": ["Mealybugs", "Powdery mildew"], "pruning_month": [],
            "description": "Colorful foliage or flowering plant for indoor growing.",
        },
    },
    "Bird of Paradise": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Full sun",
        "care_level": "Medium",
        "is_toxic_to_pets": True,
        "description": "Tropical plant with large banana-like leaves.",
        "cycle": "Perennial",
        "growth_rate": "Medium",
        "botanical_data": {
            "family": "Strelitziaceae", "origin": ["South Africa"], "type": "Herb",
            "drought_tolerant": False, "maintenance": "Medium", "poisonous_to_humans": True,
            "medicinal": False, "indoor": True, "tropical": True, "rare": False,
            "flowers": True, "soil": ["Well-drained", "Loamy"], "propagation": ["Division"],
            "pest_susceptibility": ["Scale insects", "Spider mites"], "pruning_month": [],
            "description": "Tropical plant with large banana-like leaves.",
        },
    },
    "Anthurium": {
        "watering_frequency_days": 7,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Medium",
        "is_toxic_to_pets": True,
        "description": "Tropical plant with heart-shaped, glossy flowers.",
        "cycle": "Perennial",
        "growth_rate": "Medium",
        "botanical_data": {
            "family": "Araceae", "origin": ["Central & South America"], "type": "Herb",
            "indoor": True, "tropical": True, "flowers": True, "poisonous_to_humans": True,
            "soil": ["Orchid mix", "Peat-based"], "propagation": ["Division"],
            "description": "Tropical plant with heart-shaped, glossy flowers.",
        },
    },
    "English Ivy": {
        "watering_frequency_days": 5,
        "watering_guide": "Average",
        "sunlight_requirement": "Bright indirect light",
        "care_level": "Medium",
        "is_toxic_to_pets": True,
        "description": "Classic trailing vine for indoor and outdoor use.",
        "cycle": "Perennial",
        "growth_rate": "Fast",
        "botanical_data": {
            "family": "Araliaceae", "origin": ["Europe"], "type": "Vine",
            "indoor": True, "tropical": False, "drought_tolerant": False,
            "soil": ["Moist", "Well-drained"], "propagation": ["Cutting"],
            "pest_susceptibility": ["Spider mites", "Aphids"],
            "description": "Classic trailing vine for indoor and outdoor use.",
        },
    },
    "Yucca": {
        "watering_frequency_days": 14,
        "watering_guide": "Minimum",
        "sunlight_requirement": "Full sun",
        "care_level": "Low",
        "is_toxic_to_pets": True,
        "description": "Desert plant with sword-like leaves on a woody trunk.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Asparagaceae", "origin": ["Americas"], "type": "Shrub",
            "drought_tolerant": True, "maintenance": "Low", "indoor": True, "tropical": False,
            "soil": ["Sandy", "Well-drained"], "propagation": ["Cutting", "Division"],
            "description": "Desert plant with sword-like leaves on a woody trunk.",
        },
    },
    "Venus Flytrap": {
        "watering_frequency_days": 3,
        "watering_guide": "Frequent",
        "sunlight_requirement": "Full sun",
        "care_level": "High",
        "is_toxic_to_pets": False,
        "description": "Carnivorous plant that catches insects with snap traps.",
        "cycle": "Perennial",
        "growth_rate": "Slow",
        "botanical_data": {
            "family": "Droseraceae", "origin": ["North America"], "type": "Carnivorous",
            "drought_tolerant": False, "maintenance": "High", "poisonous_to_humans": False,
            "medicinal": False, "indoor": True, "tropical": False, "rare": True,
            "soil": ["Sphagnum moss", "Perlite"], "propagation": ["Division", "Seed"],
            "description": "Carnivorous plant that catches insects with snap traps.",
        },
    },
}


class PerenualService:
    """
    Service to fetch plant care information from Perenual API.
    
    Provides botanical data including:
    - Watering frequency
    - Sunlight requirements
    - Care level
    - Toxicity to pets
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Perenual service.
        
        Args:
            api_key: Perenual API key. If None, uses PERENUAL_API_KEY env var.
        """
        self.api_key = api_key or PERENUAL_API_KEY
        if not self.api_key:
            logger.warning("No Perenual API key provided. Some features will be unavailable.")
        self.base_url = PERENUAL_BASE_URL
        self.session = requests.Session()
    
    def fetch_plant_care_info(self, species_name: str) -> Optional[Dict[str, Any]]:
        """
        Fetch care information for a plant species.
        
        Args:
            species_name: Plant species (e.g., "Monstera deliciosa")
            
        Returns:
            Dictionary with plant care info
        """
        if not self.api_key:
            logger.warning("Perenual API key not configured. Returning mock data.")
            return self._get_mock_plant_data(species_name)
        
        # Clean search term: e.g., "Snake plant (Sanseviera)" -> "Snake plant"
        clean_name = species_name.split("(")[0].strip()
        
        try:
            # Step 1: Search for plant
            search_url = f"{self.base_url}/species-list"
            params = {
                "key": self.api_key,
                "q": clean_name,
            }
            
            response = self.session.get(search_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("data") or len(data["data"]) == 0:
                logger.info(f"Plant species not found: {clean_name}")
                return self._get_mock_plant_data(species_name)
            
            # Get the ID of the best match
            plant_id = data["data"][0].get("id")
            if not plant_id:
                return self._get_mock_plant_data(species_name)
                
            # Step 2: Fetch detailed care info
            details_url = f"{self.base_url}/species/details/{plant_id}"
            det_response = self.session.get(details_url, params={"key": self.api_key}, timeout=10)
            
            # Handle Paywall / Rate limits (Perenual 429 error)
            if det_response.status_code == 429:
                logger.warning(f"Perenual API paywall/rate-limit hit for {clean_name}.")
                return self._get_mock_plant_data(species_name)
                
            det_response.raise_for_status()
            plant_data = det_response.json()
            
            return self._parse_plant_data(plant_data, species_name)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching plant data from Perenual: {type(e).__name__} - {e}")
            return self._get_mock_plant_data(species_name)
        except Exception as e:
            logger.error(f"Unexpected error in Perenual service: {e}")
            return self._get_mock_plant_data(species_name)
    
    @staticmethod
    def _parse_plant_data(plant_json: Dict[str, Any], original_name: str) -> Dict[str, Any]:
        """
        Parse Perenual API response and map to our schema.
        Returns both first-class fields and a botanical_data JSON blob.
        """
        # Extract watering info — prefer benchmark over text
        watering_text = plant_json.get("watering", "Average")
        if watering_text is None or "Upgrade Plan" in str(watering_text):
            watering_text = "Average"
        
        # Use watering_general_benchmark for precise scheduling
        benchmark = plant_json.get("watering_general_benchmark")
        watering_days = None
        if benchmark and isinstance(benchmark, dict):
            bench_value = benchmark.get("value")
            if bench_value and bench_value != "null":
                # Parse "7-10" → midpoint 8, or "5" → 5
                clean_val = str(bench_value).strip('"').strip("'")
                try:
                    if "-" in clean_val:
                        parts = clean_val.split("-")
                        watering_days = round((int(parts[0].strip()) + int(parts[1].strip())) / 2)
                    else:
                        watering_days = int(clean_val)
                except (ValueError, IndexError):
                    pass
        
        if watering_days is None:
            watering_days = parse_watering_to_days(watering_text)
            
        # Extract sunlight (array from API, join as string)
        sunlight_array = plant_json.get("sunlight", [])
        if isinstance(sunlight_array, list):
            sunlight_requirement = ", ".join(sunlight_array) if sunlight_array else "Bright indirect light"
        else:
            sunlight_requirement = str(sunlight_array) if sunlight_array is not None else "Bright indirect light"
            if "Upgrade Plan" in sunlight_requirement:
                sunlight_requirement = "Bright indirect light"
        
        # Extract care level
        care_level = plant_json.get("care_level") or "Low to Medium"
        
        # Extract toxicity — handle null as Unknown
        poisonous_pets = plant_json.get("poisonous_to_pets")
        is_toxic = False
        if isinstance(poisonous_pets, dict):
            is_toxic = poisonous_pets.get("is_poisonous", False)
        elif isinstance(poisonous_pets, (bool, int)):
            is_toxic = bool(poisonous_pets)
        
        # Extract poisonous_to_humans — keep null distinction
        poisonous_humans = plant_json.get("poisonous_to_humans")
        poisonous_to_humans_val = None
        if isinstance(poisonous_humans, (bool, int)):
            poisonous_to_humans_val = bool(poisonous_humans)
        
        # Clean pest_susceptibility — filter out noise
        raw_pests = plant_json.get("pest_susceptibility") or []
        pest_susceptibility = [p.strip() for p in raw_pests if p.strip() and "resistant" not in p.lower()]
        
        # Build botanical_data JSON blob (display-only fields)
        botanical_data = {
            "family": plant_json.get("family"),
            "origin": plant_json.get("origin") or [],
            "type": plant_json.get("type"),
            "description": plant_json.get("description", ""),
            "drought_tolerant": plant_json.get("drought_tolerant", False),
            "maintenance": plant_json.get("maintenance"),
            "poisonous_to_humans": poisonous_to_humans_val,
            "medicinal": plant_json.get("medicinal", False),
            "indoor": plant_json.get("indoor"),
            "tropical": plant_json.get("tropical", False),
            "rare": plant_json.get("rare", False),
            "flowers": plant_json.get("flowers", False),
            "soil": plant_json.get("soil") or [],
            "propagation": plant_json.get("propagation") or [],
            "pest_susceptibility": pest_susceptibility,
            "pruning_month": plant_json.get("pruning_month") or [],
            "cycle": plant_json.get("cycle", "Perennial"),
            "growth_rate": plant_json.get("growth_rate", "Medium"),
            "watering_benchmark": benchmark if isinstance(benchmark, dict) else None,
            "flowering_season": plant_json.get("flowering_season"),
            "hardiness": plant_json.get("hardiness"),
            "dimensions": plant_json.get("dimensions") or [],
        }
        
        # Remove None values to keep JSON clean
        botanical_data = {k: v for k, v in botanical_data.items() if v is not None}
        
        return {
            "species": original_name,
            "watering_frequency_days": watering_days,
            "watering_guide": watering_text,
            "sunlight_requirement": sunlight_requirement,
            "care_level": care_level,
            "is_toxic_to_pets": is_toxic,
            "description": plant_json.get("description", ""),
            "cycle": plant_json.get("cycle", "Perennial"),
            "growth_rate": plant_json.get("growth_rate", "Medium"),
            "botanical_data": botanical_data,
        }
    
    @staticmethod
    def _get_mock_plant_data(species_name: str) -> Dict[str, Any]:
        """
        Fallback plant care data when Perenual API is unavailable.
        
        Uses a curated dictionary of common indoor plants (covering
        the 46 species our AI model recognizes). If the species is not
        in the dictionary, returns sensible defaults.
        """
        # Normalize the name for lookup (case-insensitive, strip parenthetical)
        lookup_key = species_name.split("(")[0].strip().lower()
        
        # Check curated database first
        for key, data in KNOWN_PLANT_CARE.items():
            if key.lower() in lookup_key or lookup_key in key.lower():
                logger.info(f"Using curated fallback data for: {species_name}")
                return {
                    "species": species_name,
                    **data,
                }
        
        # Default for unknown species
        logger.info(f"No curated data for '{species_name}'. Using defaults.")
        return {
            "species": species_name,
            "watering_frequency_days": 7,
            "watering_guide": "Average",
            "sunlight_requirement": "Bright indirect light",
            "care_level": "Medium",
            "is_toxic_to_pets": False,
            "description": "",
            "cycle": "Perennial",
            "growth_rate": "Medium",
            "botanical_data": {},
        }
    
    async def fetch_plant_care_info_async(self, species_name: str) -> Optional[Dict[str, Any]]:
        """
        Fetch care information for a plant species asynchronously.
        """
        if not self.api_key:
            logger.warning("Perenual API key not configured. Returning mock data.")
            return self._get_mock_plant_data(species_name)
        
        clean_name = species_name.split("(")[0].strip()
        
        try:
            async with httpx.AsyncClient() as client:
                search_url = f"{self.base_url}/species-list"
                params = {"key": self.api_key, "q": clean_name}
                
                response = await client.get(search_url, params=params, timeout=20.0)
                response.raise_for_status()
                data = response.json()
                
                if not data.get("data") or len(data["data"]) == 0:
                    logger.info(f"Plant species not found: {clean_name}")
                    return self._get_mock_plant_data(species_name)
                
                plant_id = data["data"][0].get("id")
                if not plant_id:
                    return self._get_mock_plant_data(species_name)
                    
                details_url = f"{self.base_url}/species/details/{plant_id}"
                det_response = await client.get(details_url, params={"key": self.api_key}, timeout=20.0)
                
                if det_response.status_code == 429:
                    logger.warning(f"Perenual API paywall/rate-limit hit for {clean_name}.")
                    return self._get_mock_plant_data(species_name)
                    
                det_response.raise_for_status()
                plant_data = det_response.json()
                
                return self._parse_plant_data(plant_data, species_name)
                
        except httpx.HTTPError as e:
            logger.error(f"Error fetching plant data from Perenual: {type(e).__name__} - {e}")
            return self._get_mock_plant_data(species_name)
        except Exception as e:
            logger.error(f"Unexpected error in Perenual service: {e}")
            return self._get_mock_plant_data(species_name)

    # Keys that a "complete" botanical_data blob should contain.
    # Used by fetch_plant_care_info_with_llm_fallback to decide whether
    # LLM enrichment is needed.  Centralised here so the Router never
    # has to duplicate this decision logic.
    EXPECTED_BOTANICAL_KEYS = {
        "family", "origin", "type", "description", "soil",
        "propagation", "pest_susceptibility", "drought_tolerant",
        "indoor", "tropical", "maintenance", "poisonous_to_humans",
    }

    async def fetch_plant_care_info_with_llm_fallback(
        self, species_name: str, _bypass_cache: bool = False
    ) -> Dict[str, Any]:
        """
        Try Perenual first, then fall back to Gemini LLM for care data.
        
        This is the **single** place that decides whether an LLM call is
        needed.  The Router should call this method and accept whatever it
        returns — no second-guessing.

        LLM is triggered when:
          1. description is empty/missing, OR sunlight is unknown, OR
          2. botanical_data is missing more than 3 of EXPECTED_BOTANICAL_KEYS.
        """
        # ── Static cache lookup — skip Perenual + LLM entirely ──
        if not _bypass_cache and species_name in _SPECIES_CACHE:
            logger.info(f"⚡ Static cache hit: {species_name}")
            return _SPECIES_CACHE[species_name]

        logger.info(f"🌐 Cache miss for {species_name}, calling Perenual...")

        # Try Perenual first (async call)
        result = await self.fetch_plant_care_info_async(species_name)
        
        if not result:
            result = self._get_mock_plant_data(species_name)

        # Decide if LLM enrichment is needed
        needs_llm = False

        # Condition 1: core fields are missing / generic
        if (
            result.get("description") in (None, "", "Mock data - Perenual API not configured")
            or result.get("sunlight_requirement") in (None, "Unknown")
        ):
            needs_llm = True

        # Condition 2: botanical_data is too sparse
        bd = result.get("botanical_data") or {}
        missing_keys = self.EXPECTED_BOTANICAL_KEYS - set(bd.keys())
        if len(missing_keys) > 3:
            needs_llm = True

        if needs_llm:
            try:
                llm_result = await self._get_llm_plant_data(species_name)
                if llm_result:
                    # Preserve curated botanical_data; LLM fills gaps
                    curated_bd = result.get("botanical_data") or {}
                    llm_bd = llm_result.get("botanical_data") or {}
                    # Merge: curated values win, LLM fills blanks
                    merged_bd = {**llm_bd, **{k: v for k, v in curated_bd.items() if v}}
                    llm_result["botanical_data"] = merged_bd
                    # Also keep any first-class curated values that are valid
                    for key in ("sunlight_requirement", "care_level", "watering_guide",
                                "watering_frequency_days", "is_toxic_to_pets"):
                        curated_val = result.get(key)
                        if curated_val not in (None, "", "Unknown"):
                            llm_result[key] = curated_val
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM enrichment failed for {species_name}: {e}")

        return result
    
    @staticmethod
    async def _get_llm_plant_data(species_name: str) -> Optional[Dict[str, Any]]:
        """
        Use Gemini LLM to generate care data for a plant species.
        
        This is the smart fallback when Perenual API is unavailable
        (free tier limit, rate limit, etc.).
        """
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            return None
        
        prompt = f"""You are a botanical database. Return ONLY a JSON object (no markdown, no explanation) with care information for this indoor plant:

Plant: {species_name}

Return this exact JSON structure:
{{
  "watering_frequency_days": <integer: days between watering>,
  "watering_guide": "<Frequent|Average|Minimum>",
  "sunlight_requirement": "<e.g. Bright indirect light>",
  "care_level": "<Low|Medium|High>",
  "is_toxic_to_pets": <true|false>,
  "description": "<1 sentence description>",
  "cycle": "<Perennial|Annual|Biennial>",
  "growth_rate": "<Slow|Medium|Fast>",
  "botanical_data": {{
    "family": "<plant family e.g. Araceae>",
    "origin": ["<region of origin>"],
    "type": "<Herb|Vine|Succulent|Tree|Shrub|Fern|Epiphyte>",
    "description": "<1 sentence description>",
    "drought_tolerant": <true|false>,
    "maintenance": "<Low|Medium|High>",
    "poisonous_to_humans": <true|false|null>,
    "medicinal": <true|false>,
    "indoor": <true|false>,
    "tropical": <true|false>,
    "rare": <true|false>,
    "flowers": <true|false>,
    "flowering_season": "<season or null>",
    "soil": ["<soil type>"],
    "propagation": ["<method>"],
    "pest_susceptibility": ["<common pest>"],
    "pruning_month": ["<month>"]
  }}
}}

Respond ONLY with the JSON object. No other text."""

        try:
            gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{gemini_url}?key={gemini_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 600,
                        },
                    },
                    timeout=60.0,
                )
                response.raise_for_status()
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                
                # Clean up: strip markdown code fences if present
                text = text.strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]  # Remove first line
                if text.endswith("```"):
                    text = text.rsplit("\n", 1)[0]  # Remove last line
                text = text.strip()
                
                care_data = json.loads(text)
                care_data["species"] = species_name
                
                # Validate required fields
                care_data.setdefault("watering_frequency_days", 7)
                care_data.setdefault("watering_guide", "Average")
                care_data.setdefault("sunlight_requirement", "Bright indirect light")
                care_data.setdefault("care_level", "Medium")
                care_data.setdefault("is_toxic_to_pets", False)
                care_data.setdefault("botanical_data", {})
                
                logger.info(f"LLM fallback care data generated for: {species_name}")
                return care_data
                
        except json.JSONDecodeError as e:
            logger.error(f"LLM returned invalid JSON for {species_name}: {e}")
            return None
        except Exception as e:
            logger.error(f"LLM plant data fallback failed for {species_name}: {e}")
            return None


# Singleton instance for easy access
_perenual_service: Optional[PerenualService] = None


def get_perenual_service() -> PerenualService:
    """Get or create Perenual service singleton."""
    global _perenual_service
    if _perenual_service is None:
        _perenual_service = PerenualService()
    return _perenual_service
