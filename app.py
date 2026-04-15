"""
app.py — Flask backend for Cue AI Stadium Companion.

Serves the static frontend and provides RESTful API endpoints
for venue data, crowd intelligence, AI concierge (Gemini),
translation (Google Cloud Translation), and feedback (Firebase).

Security: CSP headers on every response, rate limiting (20 req/min),
input validation, API keys via environment variables.
"""

import os
import time
import logging
import re

import requests
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress

from helpers import (
    get_phase_multiplier,
    validate_venue_id,
    calculate_wait_time,
    calculate_crowd_density,
    get_status_from_value,
    get_food_recommendations,
    compute_exit_forecast,
)
from data import VENUES, EVENT_PHASES, EXIT_RECOMMENDATIONS, AI_PREDICTIONS
from config import Config

class InvalidVenueError(ValueError):
    """Raised when a venue_id is not in the supported venues list."""
    def __init__(self, venue_id: str):
        self.venue_id = venue_id
        super().__init__(f"Invalid venue_id: '{venue_id}'. Must be one of: {', '.join(Config.SUPPORTED_VENUES)}")


class InvalidPhaseError(ValueError):
    """Raised when a phase is not in the supported phases list."""
    def __init__(self, phase: str):
        self.phase = phase
        super().__init__(f"Invalid phase: '{phase}'. Must be one of: {', '.join(Config.SUPPORTED_PHASES)}")

# ─── App Setup ─────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="")
app.config["JSON_SORT_KEYS"] = False
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # 1MB max request size

Compress(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Rate Limiter ──────────────────────────────────────────────────────
limiter = Limiter(get_remote_address, app=app, default_limits=[Config.RATE_LIMIT], storage_uri=Config.RATE_LIMIT_STORAGE)

# ─── Security Headers ─────────────────────────────────────────────────
@app.after_request
def set_security_headers(response):
    """Attach security headers to every response."""
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https://res.cloudinary.com; "
        "connect-src 'self' https://generativelanguage.googleapis.com https://translation.googleapis.com https://www.google-analytics.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com; "
        "frame-ancestors 'none';"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    return response

# ─── Input Validation Helper ──────────────────────────────────────────
def _extract_venue_phase(data: dict) -> tuple:
    """Extract and validate venue_id and phase from request JSON.

    Args:
        data: Parsed JSON body from the request.

    Returns:
        Tuple of (venue_id, phase) strings.

    Raises:
        InvalidVenueError: If venue_id is not in supported venues.
        InvalidPhaseError: If phase is not in supported phases.
    """
    venue_id = data.get("venue_id", "")
    phase = data.get("phase", "match")

    if venue_id not in Config.SUPPORTED_VENUES:
        raise InvalidVenueError(venue_id)

    if phase not in Config.SUPPORTED_PHASES:
        raise InvalidPhaseError(phase)

    return venue_id, phase

# ═══════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint for Cloud Run and monitoring."""
    return jsonify({"status": "healthy", "version": Config.VERSION})

@app.route("/api/venues", methods=["GET"])
@limiter.limit(Config.RATE_LIMIT)
def list_venues():
    summary = []
    for vid, v in VENUES.items():
        summary.append({
            "id": vid,
            "name": v["name"],
            "shortName": v["shortName"],
            "match": v["match"],
            "format": v["format"],
            "time": v["time"],
            "city": v["city"],
            "heroImage": v["heroImage"],
        })
    return jsonify(summary)

@app.route("/api/venue/<venue_id>", methods=["GET"])
@limiter.limit(Config.RATE_LIMIT)
def get_venue(venue_id: str):
    if venue_id not in Config.SUPPORTED_VENUES:
        abort(400, description=f"Invalid venue_id: '{venue_id}'.")
    return jsonify(VENUES[venue_id])

@app.route("/api/crowd-data", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def crowd_data():
    data = request.get_json(silent=True) or {}
    venue_id, phase = _extract_venue_phase(data)
    multiplier = get_phase_multiplier(phase)

    zones = [
        {"name": "North Stand", "density": calculate_crowd_density(Config.ZONE_BASE_DENSITIES["North Stand"], multiplier),
         "status": "high" if multiplier > 2 else "medium"},
        {"name": "East Gallery", "density": calculate_crowd_density(Config.ZONE_BASE_DENSITIES["East Gallery"], multiplier),
         "status": "high" if multiplier > 1.5 else "medium"},
        {"name": "South Pavilion", "density": calculate_crowd_density(Config.ZONE_BASE_DENSITIES["South Pavilion"], multiplier),
         "status": "low"},
        {"name": "West Gate Ent.", "density": calculate_crowd_density(Config.ZONE_BASE_DENSITIES["West Gate Ent."], multiplier),
         "status": "high"},
    ]

    phase_data = EVENT_PHASES[phase]
    score = phase_data["score"].get(venue_id, {"text": "LIVE", "detail": ""})
    prediction = AI_PREDICTIONS.get(phase, "Enjoy the match!")

    return jsonify({
        "zones": zones,
        "phase": {
            "label": phase_data["label"],
            "icon": phase_data["icon"],
            "description": phase_data["description"],
        },
        "score": score,
        "prediction": prediction,
    })

@app.route("/api/wait-times", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def wait_times():
    data = request.get_json(silent=True) or {}
    venue_id, phase = _extract_venue_phase(data)
    multiplier = get_phase_multiplier(phase)

    venue = VENUES[venue_id]
    gates = []
    for g in venue["gates"]:
        adjusted_wait = calculate_wait_time(g["wait"], multiplier)
        gates.append({
            "id": g["id"],
            "name": g["name"],
            "area": g["area"],
            "wait": adjusted_wait,
            "status": get_status_from_value(adjusted_wait),
            "recommended": g.get("recommended", False),
        })

    return jsonify({"gates": gates})

@app.route("/api/food-stalls", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def food_stalls():
    data = request.get_json(silent=True) or {}
    venue_id, phase = _extract_venue_phase(data)
    preference = data.get("preference")
    multiplier = get_phase_multiplier(phase)

    venue = VENUES[venue_id]
    stalls_raw = []
    for s in venue["foodStalls"]:
        adjusted_wait = calculate_wait_time(s["waitMin"], multiplier)
        stalls_raw.append({
            **s,
            "waitMin": adjusted_wait,
            "goNow": adjusted_wait < 5,
        })

    stalls = get_food_recommendations(stalls_raw, preference)
    return jsonify({"stalls": stalls})

@app.route("/api/transport", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def transport():
    data = request.get_json(silent=True) or {}
    venue_id, phase = _extract_venue_phase(data)
    multiplier = get_phase_multiplier(phase)

    venue = VENUES[venue_id]
    transport_list = []
    for t in venue["transport"]:
        entry = dict(t)
        if t["type"] == "metro":
            entry["crowd"] = "high" if multiplier > 3 else ("medium" if multiplier > 1.5 else "low")
        elif t["type"] == "rideshare":
            base_wait = int(re.search(r"\d+", str(t.get("wait", "5"))).group())
            entry["wait"] = f"{calculate_wait_time(base_wait, multiplier)} min"
            entry["surge"] = "2.5x" if multiplier > 2 else t.get("surge", "1.0x")
        elif t["type"] == "auto":
            entry["queue"] = math.ceil((t.get("queue", 0)) * multiplier)
            entry["waitMin"] = calculate_wait_time(t.get("waitMin", 10), multiplier)
        transport_list.append(entry)

    rec = EXIT_RECOMMENDATIONS.get(phase, EXIT_RECOMMENDATIONS["match"])
    forecast = compute_exit_forecast(phase)

    return jsonify({
        "transport": transport_list,
        "recommendation": rec,
        "forecast": forecast,
    })

@app.route("/api/alerts", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def alerts():
    data = request.get_json(silent=True) or {}
    venue_id = data.get("venue_id", "")
    if venue_id not in Config.SUPPORTED_VENUES:
        abort(400, description=f"Invalid venue_id: '{venue_id}'.")

    venue = VENUES[venue_id]
    return jsonify({
        "emergency": venue["emergency"],
        "alerts": [
            {"type": "info", "message": f"Welcome to {venue['name']}! Enjoy {venue['match']}."},
            {"type": "safety", "message": "Emergency exits are marked with green signs at every gate."},
        ],
    })

@app.route("/api/concierge", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def concierge():
    data = request.get_json(silent=True) or {}
    venue_id, phase = _extract_venue_phase(data)
    message = data.get("message", "").strip()

    if not message:
        abort(400, description="Message is required.")
    if len(message) > Config.MAX_MESSAGE_LENGTH:
        abort(400, description=f"Message too long. Maximum {Config.MAX_MESSAGE_LENGTH} characters.")

    venue = VENUES[venue_id]
    phase_data = EVENT_PHASES[phase]

    system_context = (
        f"You are Cue, an AI concierge for {venue['name']} during a {venue['match']} {venue['format']} match.\n"
        f"Stadium: {venue['name']}, {venue['city']}\n"
        f"User's seat: Block {venue['seats'][0]['block']}, Row {venue['seats'][0]['row']}, Seat {venue['seats'][0]['seat']}\n"
        f"Current event phase: {phase_data['label']} — {phase_data['description']}\n"
        f"Gates: {', '.join(g['name'] + ' (' + g['area'] + ', ' + str(g['wait']) + ' min wait)' for g in venue['gates'])}\n"
        f"Rules: Be concise (2-3 sentences). Give directions relative to user seat. No markdown. Mention timing."
    )

    if not Config.GEMINI_API_KEY:
        fallback = _get_fallback_response(message)
        return jsonify({"reply": fallback, "source": "fallback"})

    try:
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{Config.GEMINI_MODEL}:generateContent?key={Config.GEMINI_API_KEY}",
            json={
                "systemInstruction": {"parts": [{"text": system_context}]},
                "contents": [{"parts": [{"text": message}]}],
            },
            timeout=Config.GEMINI_TIMEOUT,
        )
        result = resp.json()

        if "error" in result:
            logger.error("Gemini API error: %s", result["error"])
            return jsonify({"reply": _get_fallback_response(message), "source": "fallback"})

        reply = (
            result.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", _get_fallback_response(message))
        )
        reply = reply.replace("*", "").replace("#", "")
        return jsonify({"reply": reply, "source": "gemini"})

    except requests.exceptions.RequestException as e:
        logger.error("Gemini request failed: %s", str(e))
        return jsonify({"reply": _get_fallback_response(message), "source": "fallback"})

def _get_fallback_response(message: str) -> str:
    fallbacks = {
        "food": "The Gujarati Farsan counter near Gate C is your best bet — just 2 minutes from Block B with a current wait of about 3 minutes.",
        "restroom": "Restroom A (North) is closest — about 2 minutes walk. Current queue is short, roughly 3-4 minutes.",
        "exit": "For detailed exit recommendations with transport options, check the Exit tab!",
        "parking": "Main parking area is accessible via Gate A. After the match, expect 15-20 min to clear.",
        "seat": "You're in Block B, Row 12, Seat 34. Nearest restroom: North (2 min walk).",
        "emergency": "🚨 Head to the first-aid station near Gate B. Alert any steward for immediate assistance.",
    }
    msg_lower = message.lower()
    for key, response in fallbacks.items():
        if key in msg_lower:
            return response
    return "I'm currently in demo mode. Try asking about food, restrooms, exits, or parking!"

@app.route("/api/translate", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def translate():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    target = data.get("target", "hi")

    if not text:
        abort(400, description="Text is required for translation.")
    if len(text) > Config.MAX_TEXT_LENGTH:
        abort(400, description=f"Text too long. Maximum {Config.MAX_TEXT_LENGTH} characters.")

    if not Config.GOOGLE_TRANSLATE_API_KEY:
        return jsonify({"translatedText": text, "source": "passthrough", "note": "Translation API key not configured."})

    try:
        resp = requests.post(
            f"https://translation.googleapis.com/language/translate/v2?key={Config.GOOGLE_TRANSLATE_API_KEY}",
            json={"q": text, "target": target, "format": "text"},
            timeout=10,
        )
        result = resp.json()
        translated = result.get("data", {}).get("translations", [{}])[0].get("translatedText", text)
        return jsonify({"translatedText": translated, "source": "google"})
    except requests.exceptions.RequestException as e:
        logger.error("Translation error: %s", str(e))
        return jsonify({"translatedText": text, "source": "error"})

@app.route("/api/translate-batch", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def translate_batch():
    """Translate multiple strings in a single request.
    Expects JSON: { "texts": ["str1", "str2", ...], "target": "hi" }
    Returns: { "translations": ["translated1", "translated2", ...] }
    """
    data = request.get_json(silent=True) or {}
    texts = data.get("texts", [])
    target = data.get("target", "hi")

    if not isinstance(texts, list) or len(texts) == 0:
        abort(400, description="texts must be a non-empty array.")
    if len(texts) > 50:
        abort(400, description="Maximum 50 texts per batch.")

    if not Config.GOOGLE_TRANSLATE_API_KEY:
        return jsonify({"translations": texts, "source": "passthrough"})

    try:
        resp = requests.post(
            f"https://translation.googleapis.com/language/translate/v2?key={Config.GOOGLE_TRANSLATE_API_KEY}",
            json={"q": texts, "target": target, "format": "text"},
            timeout=10,
        )
        result = resp.json()
        translations = [t.get("translatedText", orig) for t, orig in
                        zip(result.get("data", {}).get("translations", []), texts)]
        return jsonify({"translations": translations, "source": "google"})
    except Exception as e:
        logger.error("Batch translation error: %s", str(e))
        return jsonify({"translations": texts, "source": "error"})

@app.route("/api/save-feedback", methods=["POST"])
@limiter.limit(Config.RATE_LIMIT)
def save_feedback():
    data = request.get_json(silent=True) or {}
    venue_id = data.get("venue_id", "")
    rating = data.get("rating", 0)
    chips = data.get("chips", [])

    if venue_id not in Config.SUPPORTED_VENUES:
        abort(400, description="Invalid venue_id.")
    if not isinstance(rating, (int, float)) or not (1 <= rating <= 5):
        abort(400, description="Rating must be between 1 and 5.")
    if not isinstance(chips, list):
        abort(400, description="Chips must be a list.")

    feedback_entry = {
        "venue_id": venue_id,
        "rating": rating,
        "chips": chips[:Config.MAX_FEEDBACK_CHIPS],
        "timestamp": time.time(),
    }

    if Config.FIREBASE_API_KEY:
        try:
            firestore_doc = {
                "fields": {
                    "venue_id": {"stringValue": venue_id},
                    "rating": {"doubleValue": float(rating)},
                    "chips": {"arrayValue": {"values": [{"stringValue": c} for c in chips]}},
                    "timestamp": {"timestampValue": f"{int(time.time())}.000Z"}
                }
            }
            project_id = "cue-app-promptwars"
            parent = f"projects/{project_id}/databases/(default)/documents/feedback"
            
            headers = {"Content-Type": "application/json"}
            auth_header = request.headers.get("Authorization")
            if auth_header:
                headers["Authorization"] = auth_header

            fs_resp = requests.post(
                f"https://firestore.googleapis.com/v1/{parent}",
                headers=headers,
                json=firestore_doc,
                timeout=5
            )
            
            if fs_resp.ok:
                logger.info("✅ Feedback stored in Firestore")
            else:
                logger.error("❌ Firestore store failed: %s", fs_resp.text)
                
        except Exception as e:
            logger.error("❌ Firebase save error: %s", str(e))

    logger.info("Feedback received: venue=%s rating=%s", venue_id, rating)
    return jsonify({"status": "saved", "feedback": feedback_entry})

@app.route("/api/firebase-config", methods=["GET"])
@limiter.limit(Config.RATE_LIMIT)
def firebase_config():
    return jsonify({"apiKey": Config.FIREBASE_API_KEY})

# ─── Error Handlers ────────────────────────────────────────────────────
@app.errorhandler(InvalidVenueError)
def handle_invalid_venue(e):
    """Handle InvalidVenueError with 400 JSON response."""
    return jsonify({"error": str(e)}), 400


@app.errorhandler(InvalidPhaseError)
def handle_invalid_phase(e):
    """Handle InvalidPhaseError with 400 JSON response."""
    return jsonify({"error": str(e)}), 400


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e.description)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found."}), 404

@app.errorhandler(429)
def too_many_requests(e):
    return jsonify({"error": "Rate limit exceeded."}), 429

# ─── Entry Point ───────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
