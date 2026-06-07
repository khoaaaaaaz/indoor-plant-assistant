# app/api/endpoints/explore.py
"""
Plant Explore endpoint — returns fun facts + FAQs.
Hard-coded for common plants, Gemini LLM fallback for others.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.plant import Plant
from app.api.dependencies import get_current_user
from typing import Optional
import os
import httpx
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["explore"])

# ─── Hard-coded Explore Data ────────────────────────────────
# Covers the most common plants our AI model recognizes.
# Saves Gemini API calls and ensures instant loading.
#
PLANT_EXPLORE = {
    "aloe vera": {
        "fun_fact": "Ancient Egyptians called Aloe Vera the 'plant of immortality' and placed it among funeral gifts for pharaohs over 6,000 years ago.",
        "faqs": [
            {"q": "Why are my Aloe leaves turning brown?", "a": "Usually overwatering or too much direct sunlight. Let soil dry completely between waterings and provide bright indirect light."},
            {"q": "Can I use the gel directly on skin?", "a": "Yes! Cut a mature outer leaf, scoop the clear gel, and apply to burns or dry skin. Always patch-test first."},
        ],
    },
    "monstera": {
        "fun_fact": "Monstera's iconic split leaves evolved to let wind pass through without damaging the plant — and to allow sunlight to reach lower leaves in dense jungles.",
        "faqs": [
            {"q": "Why doesn't my Monstera have holes yet?", "a": "Young Monstera leaves are solid. Splits (fenestrations) typically appear after 2-3 years when the plant gets enough bright indirect light."},
            {"q": "Should I use a moss pole?", "a": "Yes! Monstera is a natural climber. A moss pole encourages larger leaves and a more compact, upright growth pattern."},
        ],
    },
    "snake plant": {
        "fun_fact": "NASA's Clean Air Study found that Snake Plants are one of the best air-purifying houseplants, converting CO₂ to oxygen even at night — making them perfect bedroom companions.",
        "faqs": [
            {"q": "How often should I really water it?", "a": "Every 2-3 weeks in summer, once a month in winter. The #1 killer is overwatering. When in doubt, wait."},
            {"q": "Can it survive in a dark room?", "a": "It tolerates low light but grows best in indirect sunlight. In very dark rooms, growth will be extremely slow."},
        ],
    },
    "pothos": {
        "fun_fact": "In the wild, Pothos can climb trees up to 20 meters tall, and its leaves grow up to 100cm wide — nothing like the small-leaved houseplant version we know!",
        "faqs": [
            {"q": "Why are the leaves turning yellow?", "a": "Usually overwatering. Check if the soil is soggy. Let the top inch dry out before watering again."},
            {"q": "Can I grow it in just water?", "a": "Yes! Pothos thrives in water indefinitely. Change the water every 1-2 weeks and add liquid fertilizer monthly."},
        ],
    },
    "spider plant": {
        "fun_fact": "Spider Plants are champion air purifiers and one of the easiest houseplants to propagate — those dangling 'babies' (plantlets) can be snipped and rooted in water within days.",
        "faqs": [
            {"q": "Why do the leaf tips turn brown?", "a": "Typically caused by fluoride in tap water or low humidity. Try using filtered water and occasional misting."},
            {"q": "How do I propagate the babies?", "a": "Snip a plantlet with a few inches of stem, place in water until roots form (~2 weeks), then plant in soil."},
        ],
    },
    "peace lily": {
        "fun_fact": "Peace Lilies are drama queens — they dramatically wilt when thirsty, but bounce back within hours of watering, making them the perfect plant for forgetful owners.",
        "faqs": [
            {"q": "Why won't my Peace Lily flower?", "a": "It needs bright indirect light to bloom. In too-dark spots, it'll grow lush leaves but no white flowers."},
            {"q": "Is it really toxic to pets?", "a": "Yes, it contains calcium oxalate crystals that cause mouth irritation if chewed. Keep away from curious cats and dogs."},
        ],
    },
    "rubber plant": {
        "fun_fact": "Rubber Plants (Ficus elastica) were once tapped for their milky latex sap to produce natural rubber — before the rubber tree (Hevea brasiliensis) replaced them commercially.",
        "faqs": [
            {"q": "Why is it dropping leaves?", "a": "Usually due to sudden temperature changes, cold drafts, or overwatering. Keep it in a stable, warm spot."},
            {"q": "How do I make it branch out?", "a": "Prune the top growing point. This forces the plant to grow side shoots, creating a bushier shape."},
        ],
    },
    "orchid": {
        "fun_fact": "Orchids are the largest family of flowering plants with over 28,000 species — that's more than mammals, birds, and reptiles combined!",
        "faqs": [
            {"q": "My orchid finished blooming. Is it dead?", "a": "No! Cut the flower spike above a node, keep watering weekly, and it can re-bloom in 2-3 months."},
            {"q": "Should I use ice cubes to water?", "a": "It works but isn't ideal — orchids are tropical and prefer room-temperature water. Soak the roots for 10 minutes weekly."},
        ],
    },
    "zz plant": {
        "fun_fact": "ZZ Plants store water in their thick potato-like rhizomes underground — they can survive months of neglect, earning the nickname 'the eternity plant.'",
        "faqs": [
            {"q": "Is it really toxic?", "a": "It contains calcium oxalate crystals. Wash hands after handling and keep away from pets and children who might chew it."},
            {"q": "Why is it growing so slowly?", "a": "ZZ Plants are naturally slow growers. In low light they grow even slower. Bright indirect light speeds things up."},
        ],
    },
    "calathea": {
        "fun_fact": "Calatheas are called 'prayer plants' because they fold their leaves upward at night like hands in prayer — a process called nyctinasty driven by their internal clock.",
        "faqs": [
            {"q": "Why are the leaf edges crispy?", "a": "Low humidity is the #1 cause. Calatheas love 50%+ humidity — use a humidifier or pebble tray."},
            {"q": "Why are the colors fading?", "a": "Too much direct sun bleaches the patterns. Move to bright indirect light for the most vivid leaf colors."},
        ],
    },
    "jade plant": {
        "fun_fact": "In East Asian tradition, Jade Plants (Crassula ovata) are believed to attract wealth and prosperity — which is why they're a classic housewarming and business-opening gift.",
        "faqs": [
            {"q": "Why are the leaves wrinkling?", "a": "Wrinkled leaves mean it's thirsty. Give it a thorough soak and it'll plump back up within a day."},
            {"q": "Can it flower?", "a": "Yes! Mature Jade Plants (5+ years) can produce clusters of tiny star-shaped white-pink flowers in winter."},
        ],
    },
    "boston fern": {
        "fun_fact": "Boston Ferns are living fossils — ferns have existed for 360 million years, predating dinosaurs, flowers, and even seeds.",
        "faqs": [
            {"q": "Why is it shedding so many leaves?", "a": "Low humidity or inconsistent watering. Ferns love moisture — mist daily and keep soil consistently damp (not soggy)."},
            {"q": "Can it go outside in summer?", "a": "Yes! They thrive on shaded porches. Just bring them in before temperatures drop below 10°C (50°F)."},
        ],
    },
    "dracaena": {
        "fun_fact": "The Dragon Tree (Dracaena draco) gets its name from its blood-red resin called 'dragon's blood,' which was used as dye, medicine, and varnish for centuries.",
        "faqs": [
            {"q": "Why are the lower leaves yellowing?", "a": "This is normal — Dracaenas naturally shed older lower leaves as they grow. Only worry if many leaves yellow at once."},
            {"q": "Is fluoride in tap water a problem?", "a": "Yes! Dracaenas are very sensitive to fluoride, which causes brown leaf tips. Use filtered or distilled water."},
        ],
    },
    "venus flytrap": {
        "fun_fact": "Venus Flytraps can count! A trap only snaps shut after TWO touches within 20 seconds — this prevents wasting energy on raindrops and debris.",
        "faqs": [
            {"q": "Should I feed it bugs?", "a": "Only if it's indoors and can't catch its own. One small insect per trap, once a month. Never feed it human food."},
            {"q": "Why are the traps turning black?", "a": "Each trap has a lifespan of 3-5 closings, then dies. New traps grow from the center — it's normal."},
        ],
    },
}


# In-memory caches to reduce Gemini API calls and latency
_VI_TRANSLATION_CACHE = {}  # key: static_plant_key -> vietnamese_dict
_GENERATION_CACHE = {}     # key: (plant_name, species, language) -> dict


@router.get("/plants/{plant_id}/explore")
async def get_plant_explore(
    plant_id: int,
    language: str = Query("en"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get fun fact + FAQs for a plant.
    Uses hard-coded data for common plants, Gemini LLM for others.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Try hard-coded data first
    name_lower = (plant.name or "").lower()
    species_lower = (plant.species or "").lower()
    
    for key, data in PLANT_EXPLORE.items():
        if key in name_lower or key in species_lower:
            # If Vietnamese, translate via Gemini (with caching)
            if language == "vi":
                if key in _VI_TRANSLATION_CACHE:
                    return _VI_TRANSLATION_CACHE[key]
                translated = await _translate_explore(data, plant.name)
                if translated:
                    _VI_TRANSLATION_CACHE[key] = translated
                    return translated
            return data

    # Check dynamic generation cache
    gen_cache_key = (plant.name, plant.species or "", language)
    if gen_cache_key in _GENERATION_CACHE:
        return _GENERATION_CACHE[gen_cache_key]

    # Fallback: generate via Gemini
    generated = await _generate_explore(plant.name, plant.species, language)
    if generated:
        _GENERATION_CACHE[gen_cache_key] = generated
        return generated

    # Ultimate fallback
    return {
        "fun_fact": f"{plant.name} is a wonderful addition to any indoor garden." if language == "en"
            else f"{plant.name} là một bổ sung tuyệt vời cho bất kỳ khu vườn trong nhà nào.",
        "faqs": [],
    }


async def _generate_explore(
    name: str, species: Optional[str], language: str
) -> Optional[dict]:
    """Use Gemini to generate explore content for unknown plants."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return None

    lang_instruction = "in Vietnamese" if language == "vi" else "in English"

    prompt = f"""You are a botanical expert writing for a minimalist plant care app.
Given plant: {name} ({species or 'unknown species'}).
Generate content {lang_instruction}. Return ONLY a valid JSON object:
{{
  "fun_fact": "One fascinating sentence about this plant's history or biology.",
  "faqs": [
    {{"q": "Common beginner question?", "a": "Concise answer under 30 words."}},
    {{"q": "Another practical question?", "a": "Concise answer under 30 words."}}
  ]
}}
Respond with ONLY the JSON. No markdown, no explanation."""

    try:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{url}?key={gemini_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300},
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("\n", 1)[0]
            return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Gemini explore generation failed for {name}: {e}")
        return None


async def _translate_explore(data: dict, plant_name: str) -> Optional[dict]:
    """Translate hard-coded explore content to Vietnamese via Gemini."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return None

    prompt = f"""Translate this plant info to Vietnamese. Keep the JSON structure. Be natural, not robotic.
Plant: {plant_name}
{json.dumps(data, ensure_ascii=False)}

Return ONLY the translated JSON. No markdown."""

    try:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{url}?key={gemini_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 400},
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("\n", 1)[0]
            return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Gemini explore translation failed for {plant_name}: {e}")
        return None
