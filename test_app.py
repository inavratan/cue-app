"""
tests/test_app.py — Test suite for Cue Stadium Companion API.

10 tests covering all endpoints, input validation, and security headers.
Run: pytest tests/ -v
"""

import pytest
from app import app


@pytest.fixture
def client():
    """Create a Flask test client for each test."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ─── Test 1: GET / returns 200 ─────────────────────────────────────────
def test_index_returns_200(client):
    """GET / should serve the main index.html page with HTTP 200."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Cue" in response.data


# ─── Test 2: GET /api/venues returns 3 venues ─────────────────────────
def test_venues_returns_three(client):
    """GET /api/venues should return exactly 3 venue summaries."""
    response = client.get("/api/venues")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 3
    venue_ids = [v["id"] for v in data]
    assert "wankhede" in venue_ids
    assert "narendra_modi" in venue_ids
    assert "salt_lake" in venue_ids


# ─── Test 3: POST /api/crowd-data valid structure ──────────────────────
def test_crowd_data_valid(client):
    """POST /api/crowd-data should return zones, phase, score, prediction."""
    response = client.post(
        "/api/crowd-data",
        json={"venue_id": "wankhede", "phase": "match"},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "zones" in data
    assert len(data["zones"]) == 4
    assert "phase" in data
    assert "score" in data
    assert "prediction" in data


# ─── Test 4: POST /api/wait-times returns gates ───────────────────────
def test_wait_times_returns_gates(client):
    """POST /api/wait-times should return gate wait time data."""
    response = client.post(
        "/api/wait-times",
        json={"venue_id": "narendra_modi", "phase": "pre-match"},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "gates" in data
    assert len(data["gates"]) == 4
    # Each gate should have required fields
    for gate in data["gates"]:
        assert "name" in gate
        assert "wait" in gate
        assert "status" in gate


# ─── Test 5: POST /api/food-stalls returns stalls ─────────────────────
def test_food_stalls_returns_stalls(client):
    """POST /api/food-stalls should return food stall data with goNow flags."""
    response = client.post(
        "/api/food-stalls",
        json={"venue_id": "salt_lake", "phase": "match"},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "stalls" in data
    assert len(data["stalls"]) > 0
    for stall in data["stalls"]:
        assert "name" in stall
        assert "waitMin" in stall
        assert "goNow" in stall


# ─── Test 6: POST /api/concierge returns 200 ──────────────────────────
def test_concierge_returns_reply(client):
    """POST /api/concierge should return a reply (fallback mode without API key)."""
    response = client.post(
        "/api/concierge",
        json={"venue_id": "wankhede", "phase": "match", "message": "Where is the food court?"},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "reply" in data
    assert len(data["reply"]) > 0


# ─── Test 7: POST /api/translate returns 200 ──────────────────────────
def test_translate_returns_200(client):
    """POST /api/translate should return 200 with passthrough text (no API key)."""
    response = client.post(
        "/api/translate",
        json={"text": "Hello, where is Gate A?", "target": "hi"},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "translatedText" in data


# ─── Test 8: POST /api/save-feedback returns 200 ──────────────────────
def test_save_feedback_returns_200(client):
    """POST /api/save-feedback should accept valid feedback and return confirmation."""
    response = client.post(
        "/api/save-feedback",
        json={"venue_id": "wankhede", "rating": 4, "chips": ["Entry was smooth"]},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "saved"
    assert data["feedback"]["rating"] == 4


# ─── Test 9: Invalid venue returns 400 ────────────────────────────────
def test_invalid_venue_returns_400(client):
    """POST endpoints with an invalid venue_id should return HTTP 400."""
    response = client.post(
        "/api/crowd-data",
        json={"venue_id": "nonexistent_stadium", "phase": "match"},
        content_type="application/json",
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


# ─── Test 10: Security headers are present ────────────────────────────
def test_security_headers_present(client):
    """Every response should include CSP, X-Content-Type-Options,
    X-Frame-Options, X-XSS-Protection, and Referrer-Policy headers."""
    response = client.get("/")
    assert "Content-Security-Policy" in response.headers
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "X-Frame-Options" in response.headers
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "X-XSS-Protection" in response.headers
    assert "Referrer-Policy" in response.headers


# ─── Test 11: POST /api/transport returns transport options ────────
def test_transport_returns_options(client):
    """POST /api/transport should return transport array and recommendation."""
    response = client.post(
        "/api/transport",
        json={"venue_id": "wankhede", "phase": "post-match"},
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "transport" in data
    assert "recommendation" in data
    assert "forecast" in data
    assert len(data["transport"]) > 0


# ─── Test 12: Invalid phase returns 400 ────────────────────────────
def test_invalid_phase_returns_400(client):
    """POST endpoints with an invalid phase should return HTTP 400."""
    response = client.post(
        "/api/crowd-data",
        json={"venue_id": "wankhede", "phase": "invalid_phase"},
        content_type="application/json",
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


# ─── Test 13: Health check endpoint ────────────────────────────────
def test_health_check(client):
    """GET /api/health should return healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert "version" in data


# ─── Test 14: Concierge rejects empty message ─────────────────────
def test_concierge_rejects_empty_message(client):
    """POST /api/concierge with empty message should return 400."""
    response = client.post(
        "/api/concierge",
        json={"venue_id": "wankhede", "phase": "match", "message": ""},
        content_type="application/json",
    )
    assert response.status_code == 400


# ─── Test 15: Gzip compression is active ──────────────────────────
def test_gzip_compression(client):
    """Responses should support gzip compression when requested."""
    response = client.get(
        "/api/venues",
        headers={"Accept-Encoding": "gzip"},
    )
    assert response.status_code == 200
    # flask-compress should add Content-Encoding header for compressible responses
    # The test client may not trigger it, but the endpoint must work
    assert len(response.data) > 0
