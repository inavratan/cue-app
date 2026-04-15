"""
helpers.py — Calculation and validation logic for Cue Stadium Companion API.

All utility functions used by the Flask backend for computing
crowd density, wait times, phase multipliers, and food recommendations.
"""

from typing import List, Dict, Optional, Any
from functools import lru_cache
import math


# ─── Phase Multipliers ────────────────────────────────────────────────
PHASE_MULTIPLIERS: Dict[str, float] = {
    "pre-match": 0.4,
    "match": 1.0,
    "break": 2.5,
    "post-match": 5.0,
}

VALID_VENUE_IDS: set = {"wankhede", "narendra_modi", "salt_lake"}


@lru_cache(maxsize=8)
def get_phase_multiplier(phase: str) -> float:
    """Return the crowd multiplier for a given event phase.

    Args:
        phase: One of 'pre-match', 'match', 'break', 'post-match'.

    Returns:
        A float multiplier. Defaults to 1.0 for unknown phases.

    Examples:
        >>> get_phase_multiplier('break')
        2.5
        >>> get_phase_multiplier('unknown')
        1.0
    """
    return PHASE_MULTIPLIERS.get(phase, 1.0)


def validate_venue_id(venue_id: str) -> bool:
    """Check whether the provided venue_id is a known venue.

    Args:
        venue_id: String identifier for the venue.

    Returns:
        True if valid, False otherwise.

    Examples:
        >>> validate_venue_id('wankhede')
        True
        >>> validate_venue_id('invalid')
        False
    """
    return venue_id in VALID_VENUE_IDS


@lru_cache(maxsize=128)
def calculate_wait_time(base_wait: int, phase_multiplier: float) -> int:
    """Compute adjusted wait time based on event phase.

    Args:
        base_wait: The base wait in minutes under normal conditions.
        phase_multiplier: Crowd multiplier from the current event phase.

    Returns:
        Adjusted wait time in minutes (rounded up), minimum 1.

    Examples:
        >>> calculate_wait_time(5, 2.5)
        13
        >>> calculate_wait_time(3, 0.4)
        2
    """
    return max(1, math.ceil(base_wait * phase_multiplier))


@lru_cache(maxsize=128)
def calculate_crowd_density(base_density: int, multiplier: float) -> int:
    """Compute crowd density percentage, capped at 100.

    Args:
        base_density: Base density percentage (0–100).
        multiplier: Crowd multiplier from the current event phase.

    Returns:
        Adjusted density value capped at 100.

    Examples:
        >>> calculate_crowd_density(40, 2.5)
        100
        >>> calculate_crowd_density(25, 0.4)
        10
    """
    return min(100, math.ceil(base_density * multiplier))


@lru_cache(maxsize=64)
def get_status_from_value(value: int, low_threshold: int = 10, high_threshold: int = 20) -> str:
    """Determine status label based on a numeric value.

    Args:
        value: The numeric value to evaluate (e.g. wait time).
        low_threshold: Values below this are 'low'.
        high_threshold: Values at or above this are 'high'.

    Returns:
        One of 'low', 'medium', or 'high'.

    Examples:
        >>> get_status_from_value(5)
        'low'
        >>> get_status_from_value(15)
        'medium'
        >>> get_status_from_value(25)
        'high'
    """
    if value < low_threshold:
        return "low"
    elif value < high_threshold:
        return "medium"
    return "high"


def get_food_recommendations(
    stalls: List[Dict[str, Any]],
    preference: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Filter and sort food stalls by preference and wait time.

    Args:
        stalls: List of food stall dicts with keys: name, type, waitMin, etc.
        preference: Optional dietary preference — 'veg' or 'non-veg'.
                    If None, returns all stalls sorted by wait time.

    Returns:
        Sorted list of matching food stall dicts (shortest wait first).

    Examples:
        >>> stalls = [
        ...   {"name": "Pizza", "type": "non-veg", "waitMin": 8},
        ...   {"name": "Chaat", "type": "veg", "waitMin": 3},
        ... ]
        >>> get_food_recommendations(stalls, "veg")
        [{'name': 'Chaat', 'type': 'veg', 'waitMin': 3}]
    """
    if preference and preference in ("veg", "non-veg"):
        filtered = [s for s in stalls if s.get("type") == preference]
    else:
        filtered = list(stalls)

    return sorted(filtered, key=lambda s: s.get("waitMin", 999))


def compute_exit_forecast(phase: str) -> List[Dict[str, Any]]:
    """Generate an 8-slot exit crowd forecast for the chart.

    Args:
        phase: Current event phase string.

    Returns:
        List of dicts with keys: label, value, isCurrent, isSweetSpot.
    """
    base = [10, 25, 45, 80, 100, 70, 40, 20]
    shifts = {"pre-match": 0, "match": 2, "break": 4, "post-match": 6}
    shift = shifts.get(phase, 0)

    labels = ["Now", "+15m", "+30m", "+45m", "+60m", "+75m", "+90m", "+105m"]
    result = []
    min_val = 999
    min_idx = 0

    for i in range(8):
        idx = (i + shift) % len(base)
        val = base[idx]
        if val < min_val:
            min_val = val
            min_idx = i
        result.append({
            "label": labels[i],
            "value": val,
            "isCurrent": i == 0,
            "isSweetSpot": False,
        })

    if min_idx > 0:
        result[min_idx]["isSweetSpot"] = True

    return result
