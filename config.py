"""
config.py — Centralized configuration for Cue Stadium Companion.

All magic numbers, thresholds, and application constants in one place.
"""

import os

__all__ = ["Config"]


class Config:
    """Application-wide configuration constants."""

    # Server
    PORT = int(os.environ.get("PORT", 8080))
    DEBUG = False

    # Rate Limiting
    RATE_LIMIT = "20 per minute"
    RATE_LIMIT_STORAGE = "memory://"

    # Caching
    CACHE_TTL_SECONDS = 600  # 10 minutes

    # Input Validation
    MAX_MESSAGE_LENGTH = 500
    MAX_TEXT_LENGTH = 2000
    MAX_FEEDBACK_CHIPS = 10

    # Venues and Phases
    SUPPORTED_VENUES = {"wankhede", "narendra_modi", "salt_lake"}
    SUPPORTED_PHASES = {"pre-match", "match", "break", "post-match"}

    # Crowd Density Base Values (per zone)
    ZONE_BASE_DENSITIES = {
        "North Stand": 40,
        "East Gallery": 65,
        "South Pavilion": 25,
        "West Gate Ent.": 85,
    }

    # API Keys (from environment)
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GOOGLE_TRANSLATE_API_KEY = os.environ.get("GOOGLE_TRANSLATE_API_KEY", "")
    FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")
    FIREBASE_CONFIG = os.environ.get("FIREBASE_CONFIG", "")

    # Gemini
    GEMINI_MODEL = "gemini-2.0-flash-lite"
    GEMINI_TIMEOUT = 15

    # Version
    VERSION = "2.0.0"
