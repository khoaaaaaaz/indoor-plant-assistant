# app/services/weather_service.py
"""
Weather Service using Open-Meteo Free API

Free API: https://open-meteo.com/
No API Key Required!

Documentation: https://open-meteo.com/en/docs

Usage:
    service = WeatherService()
    weather = service.get_agri_weather(latitude=21.0285, longitude=105.8542)
    next_water_date = service.calculate_watering_date(
        base_days=7,
        temperature=28.5,
        humidity=65,
        rainfall=0
    )
"""

import requests
from typing import Optional, Dict, Any, Tuple
from datetime import date, timedelta
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast"

# Default location: Hanoi, Vietnam
DEFAULT_LATITUDE = 21.0285
DEFAULT_LONGITUDE = 105.8542
CACHE_DURATION = 3600 * 6  # Cache for 6 hours


class WeatherService:
    """
    Service to fetch weather and calculate smart watering schedules.
    
    Uses Open-Meteo API (free, no key required) to get:
    - Current temperature
    - Current humidity
    - Soil moisture
    """
    
    def __init__(self):
        """Initialize weather service."""
        self.api_url = OPEN_METEO_API
        self.session = requests.Session()
        self.default_lat = DEFAULT_LATITUDE
        self.default_lon = DEFAULT_LONGITUDE
        self._cache = {}
        self._cache_ttl = 600  # 10 minutes (600 seconds)
    
    def get_agri_weather(
        self, 
        latitude: Optional[float] = None, 
        longitude: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Fetch agricultural weather data from Open-Meteo.
        
        Args:
            latitude: Location latitude (default: Hanoi)
            longitude: Location longitude (default: Hanoi)
            
        Returns:
            Dictionary with weather data:
            {
                "temperature": 28.5,  # Celsius
                "humidity": 65,  # Percentage
                "soil_moisture": 45.2,  # Percentage at 3-9cm depth
                "timestamp": datetime,
                "location": "Hanoi, Vietnam"
            }
        """
        lat = latitude or self.default_lat
        lon = longitude or self.default_lon
        
        cache_key = (round(lat, 2), round(lon, 2))
        
        import time
        if cache_key in self._cache:
            weather_data, ts = self._cache[cache_key]
            if time.time() - ts < self._cache_ttl:
                logger.info(f"Weather fetched from cache: {weather_data['temperature']}°C, {weather_data['humidity']}%")
                return weather_data
        
        try:
            params = {
                "latitude": lat,
                "longitude": lon,
                # Current values
                "current": "temperature_2m,relative_humidity_2m",
                # Hourly soil moisture (important for plants!)
                "hourly": "soil_moisture_3_to_9cm",
                "timezone": "auto",  # Auto-detect timezone
            }
            
            response = self.session.get(self.api_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract current weather
            current = data.get("current", {})
            hourly = data.get("hourly", {})
            
            # Get soil moisture (first hour)
            soil_moisture_data = hourly.get("soil_moisture_3_to_9cm", [])
            soil_moisture = soil_moisture_data[0] if soil_moisture_data else 50.0
            
            weather_data = {
                "temperature": current.get("temperature_2m", 25.0),
                "humidity": current.get("relative_humidity_2m", 60),
                "soil_moisture": soil_moisture,
                "timestamp": current.get("time", ""),
                "location": f"Latitude: {lat}, Longitude: {lon}",
            }
            
            self._cache[cache_key] = (weather_data, time.time())
            logger.info(f"Weather fetched: {weather_data['temperature']}°C, {weather_data['humidity']}%")
            return weather_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching weather data: {e}")
            return self._get_default_weather()
        except Exception as e:
            logger.error(f"Unexpected error in weather service: {e}")
            return self._get_default_weather()
    
    @staticmethod
    def _get_default_weather() -> Dict[str, Any]:
        """Return default weather data when API is unavailable."""
        return {
            "temperature": 25.0,
            "humidity": 65,
            "soil_moisture": 50.0,
            "timestamp": "",
            "location": "Default (API unavailable)",
        }
    
    def calculate_watering_date(
        self,
        base_days: int,
        temperature: float,
        humidity: float,
        soil_moisture: float,
        rainfall_mm: float = 0,
    ) -> date:
        """
        Calculate next watering date based on weather and soil conditions.
        
        Algorithm:
        1. Start with base frequency from plant data (e.g., 7 days)
        2. Temperature modifier:
           - If temp > 30°C: water sooner (-1 day)
           - If temp < 15°C: water later (+1 day)
        3. Humidity modifier:
           - If humidity > 80%: water later (+1 day)
           - If humidity < 30%: water sooner (-1 day)
        4. Soil moisture modifier:
           - If soil_moisture > 70%: water later (+2 days)
           - If soil_moisture < 30%: water sooner (-2 days)
        5. Rainfall modifier:
           - If recent rain > 5mm: skip a day (+1 day per 5mm)
        6. Clamp result between 1-30 days
        
        Args:
            base_days: Base watering frequency in days (from plant data)
            temperature: Current temperature in Celsius
            humidity: Current humidity percentage (0-100)
            soil_moisture: Current soil moisture percentage (0-100)
            rainfall_mm: Recent rainfall in mm (default 0)
            
        Returns:
            Calculated next_water_date
        """
        days = base_days
        
        # Temperature effect
        if temperature > 30:
            logger.info(f"Hot weather ({temperature}°C): reducing watering days")
            days -= 1
        elif temperature < 15:
            logger.info(f"Cold weather ({temperature}°C): increasing watering days")
            days += 1
        
        # Humidity effect
        if humidity > 80:
            logger.info(f"High humidity ({humidity}%): increasing watering days")
            days += 1
        elif humidity < 30:
            logger.info(f"Low humidity ({humidity}%): reducing watering days")
            days -= 1
        
        # Soil moisture effect (critical!)
        if soil_moisture > 70:
            logger.info(f"High soil moisture ({soil_moisture}%): increasing watering days")
            days += 2
        elif soil_moisture < 30:
            logger.info(f"Low soil moisture ({soil_moisture}%): reducing watering days")
            days -= 2
        
        # Rainfall effect
        if rainfall_mm > 5:
            rain_days = int(rainfall_mm / 5)
            logger.info(f"Recent rainfall ({rainfall_mm}mm): adding {rain_days} days")
            days += rain_days
        
        # Clamp between 1 and 30 days (plants shouldn't go longer than a month)
        days = max(1, min(30, days))
        
        next_date = date.today() + timedelta(days=days)
        logger.info(f"Next watering calculated for: {next_date} ({days} days from today)")
        
        return next_date
    
    def get_watering_schedule_with_weather(
        self,
        base_days: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Tuple[date, Dict[str, Any]]:
        """
        Combined function: fetch weather and calculate watering date in one call.
        
        Args:
            base_days: Base watering frequency from plant data
            latitude: Optional location latitude
            longitude: Optional location longitude
            
        Returns:
            Tuple of (next_water_date, weather_data)
        """
        # Fetch weather
        weather = self.get_agri_weather(latitude, longitude)
        
        # Calculate watering date
        next_date = self.calculate_watering_date(
            base_days=base_days,
            temperature=weather["temperature"],
            humidity=weather["humidity"],
            soil_moisture=weather["soil_moisture"],
            rainfall_mm=0,  # Open-Meteo free tier doesn't include rainfall in current endpoint
        )
        
        return next_date, weather


# Singleton instance for easy access
_weather_service: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    """Get or create weather service singleton."""
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
