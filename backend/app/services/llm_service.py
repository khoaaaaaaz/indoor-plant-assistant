# app/services/llm_service.py
"""
LLM Service for AI-powered plant care recommendations.

Uses Google Gemini API to generate treatment advice
when a disease is detected during a health check scan.

Requirements:
  - GEMINI_API_KEY in .env file
  - Get free key: https://aistudio.google.com/apikey

Supports multilingual output (English and Vietnamese).
Pass language="vi" for Vietnamese responses.

Returns structured JSON with both human-readable advice
and machine-readable care_adjustments for schedule impact.
"""

import os
import json
import httpx
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Language instructions for Gemini
LANGUAGE_INSTRUCTIONS = {
    "en": "Respond entirely in English.",
    "vi": "Respond entirely in Vietnamese (Tiếng Việt). Use Vietnamese plant terminology where appropriate.",
}

# Default shape for care_adjustments — all null means "no change"
DEFAULT_CARE_ADJUSTMENTS = {
    "watering_guide": None,
    "watering_frequency_days": None,
    "mist_frequency_days": None,
    "sunlight_adjustment": None,
    "fertilize_pause": None,
    "notes": None,
}

# ─── Static Disease Cache ─────────────────────────────────────
# Loaded once at app startup from disease_data.json.
# Provides instant treatment advice without Gemini API calls
# for the 9 known diseases our AI model detects.
# Falls back to live Gemini if disease_name is not in cache.
_DISEASE_CACHE_FILE = Path(__file__).parent.parent / "constants" / "disease_data.json"


def _load_disease_cache() -> dict:
    """Load disease advice from static JSON. Returns {} if file missing."""
    try:
        if _DISEASE_CACHE_FILE.exists():
            with open(_DISEASE_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info(f"✅ Disease cache loaded: {len(data)} diseases from {_DISEASE_CACHE_FILE.name}")
                return data
    except Exception as e:
        logger.warning(f"Could not load disease cache: {e}")
    return {}


_DISEASE_CACHE: dict = _load_disease_cache()


async def get_disease_recommendation(
    plant_species: Optional[str],
    disease_name: str,
    confidence: float,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    language: str = "en",
    _bypass_cache: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Call Gemini to get treatment advice for a plant disease.
    
    Returns a dict with:
      - "advice": str (markdown treatment text for display)
      - "care_adjustments": dict (structured values for schedule impact)
      - "treatment_duration_days": int or None (from static cache only)
    
    All care_adjustments fields default to null if LLM omits them.
    Returns None if API fails entirely.
    """
    # ── Static cache lookup — fast path, no API call ──
    lang_key = "vi" if language == "vi" else "en"
    if not _bypass_cache and disease_name and disease_name in _DISEASE_CACHE:
        cached = _DISEASE_CACHE[disease_name]
        cached_lang = cached.get(lang_key)
        if cached_lang:
            logger.info(f"⚡ Static cache hit: {disease_name} [{lang_key}]")
            return {
                **cached_lang,
                "treatment_duration_days": cached.get("treatment_duration_days"),
            }

    logger.info(f"🌐 Cache miss for {disease_name} [{lang_key}], calling Gemini...")

    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set. Skipping recommendations.")
        return None

    # Get language instruction (default to English if unknown code)
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])

    prompt = f"""You are an expert botanist and plant pathologist. A plant has been diagnosed with a disease.

Plant Species: {plant_species or 'Unknown species'}
Disease Detected: {disease_name} ({confidence:.0%} confidence)
Current Environment: {f'{temperature}°C' if temperature else 'Unknown temp'}, {f'{humidity}% humidity' if humidity else 'Unknown humidity'}

{lang_instruction}

Return a JSON object with exactly this structure:
{{
  "advice": "<treatment advice as markdown text, include ## Treatment, ## Prevention, ## Care Adjustment sections with emoji headers. Keep under 200 words. Be specific to this plant species and disease. Use simple language a beginner gardener can understand.>",
  "care_adjustments": {{
    "watering_guide": "<'Frequent', 'Average', or 'Minimum' — the ADJUSTED watering level for treating this disease, or null if no change needed>",
    "watering_frequency_days": <integer days between watering during treatment, or null if no change>,
    "mist_frequency_days": <integer days between misting during treatment, or null if no change>,
    "sunlight_adjustment": "<e.g. 'Move to indirect light', 'Increase light exposure', or null if no change>",
    "fertilize_pause": <true if fertilizing should be paused during treatment, false if it should continue, or null if no change>,
    "notes": "<brief one-line summary of why care was adjusted>"
  }}
}}

IMPORTANT: The care_adjustments values should reflect what the plant NEEDS during treatment, not its normal care. For example, root rot requires LESS watering, while dehydration requires MORE."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,  # Low temp = more factual
                        "maxOutputTokens": 800,
                        "response_mime_type": "application/json",
                    },
                },
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Parse JSON response — response_mime_type should ensure clean JSON,
            # but strip markdown fences as a safety net
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("\n", 1)[0]
            text = text.strip()
            
            result = json.loads(text)
            
            # Ensure advice exists
            if not result.get("advice"):
                result["advice"] = f"Disease detected: {disease_name}. Please consult a plant care guide."
            
            # Merge care_adjustments with defaults — handles partial LLM responses
            raw_adjustments = result.get("care_adjustments") or {}
            result["care_adjustments"] = {
                **DEFAULT_CARE_ADJUSTMENTS,
                **{k: v for k, v in raw_adjustments.items() if k in DEFAULT_CARE_ADJUSTMENTS},
            }
            
            if disease_name in _DISEASE_CACHE:
                result["treatment_duration_days"] = _DISEASE_CACHE[disease_name].get("treatment_duration_days")
            
            logger.info(f"LLM structured recommendation generated for {disease_name} (lang={language})")
            return result
            
    except json.JSONDecodeError as e:
        logger.error(f"LLM returned invalid JSON for {disease_name}: {e}")
        # Fallback: return text-only advice if JSON parsing fails
        try:
            fallback_res = {
                "advice": text if text else f"Disease detected: {disease_name}.",
                "care_adjustments": {**DEFAULT_CARE_ADJUSTMENTS},
            }
            if disease_name in _DISEASE_CACHE:
                fallback_res["treatment_duration_days"] = _DISEASE_CACHE[disease_name].get("treatment_duration_days")
            return fallback_res
        except Exception:
            return None
    except httpx.TimeoutException:
        logger.error("Gemini API timed out (15s)")
        return None
    except Exception as e:
        logger.error(f"LLM recommendation failed: {e}")
        return None
