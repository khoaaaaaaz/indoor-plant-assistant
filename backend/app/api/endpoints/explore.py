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
from pathlib import Path

_EXPLORE_DATA_FILE = Path(__file__).parent.parent.parent / "constants" / "explore_data.json"

try:
    with open(_EXPLORE_DATA_FILE, "r", encoding="utf-8") as f:
        PLANT_EXPLORE = json.load(f)
except Exception as e:
    logger.error(f"Failed to load explore_data.json: {e}")
    PLANT_EXPLORE = {}

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
                timeout=60.0,
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
                timeout=60.0,
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
