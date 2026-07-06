"""
TrailBeacon backend tests — auth (register/login/logout/me), per-user isolation,
public tracker endpoints, geofence event scoping.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://device-tracking-app-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

_UNIQ = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
USER_A = {"email": f"usera_e2e_{_UNIQ}@example.com", "password": "Password123", "name": "User A"}
USER_B = {"email": f"userb_e2e_{_UNIQ}@example.com", "password": "Password123", "name": "User B"}


def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session_a():
    s = new_session()
    r = s.post(f"{API}/auth/register", json=USER_A, timeout=20)
    assert r.status_code == 200, f"register A: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def session_b():
    s = new_session()
    r = s.post(f"{API}/auth/register", json=USER_B, timeout=20)
    assert r.status_code == 200, f"register B: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def user_a_device(session_a):
    r = session_a.post(f"{API}/devices", json={"name": "A-Tracker-1", "color": "#F59E0B"})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def user_a_geofence(session_a):
    # a geofence around (10,10) radius 500m
    r = session_a.post(f"{API}/geofences", json={"name": "A-Home", "lat": 10.0, "lng": 10.0, "radius": 500})
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("service") == "TrailBeacon"


# ---------- Auth ----------
class TestAuth:
    def test_register_sets_cookies_and_returns_user(self):
        s = new_session()
        email = f"reg_{_UNIQ}_{os.urandom(2).hex()}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123", "name": "Reg"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == email
        assert "id" in data
        assert data["name"] == "Reg"
        # cookies
        cookie_names = {c.name for c in s.cookies}
        assert "access_token" in cookie_names
        assert "refresh_token" in cookie_names

    def test_register_duplicate_email_400(self, session_a):
        s = new_session()
        r = s.post(f"{API}/auth/register", json=USER_A)
        assert r.status_code == 400

    def test_login_success_and_wrong_password(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]})
        assert r.status_code == 200
        assert r.json()["email"] == USER_A["email"]
        assert "access_token" in {c.name for c in s.cookies}

        s2 = new_session()
        r2 = s2.post(f"{API}/auth/login", json={"email": USER_A["email"], "password": "WRONG_PASS"})
        assert r2.status_code == 401

    def test_me_with_cookie_and_without(self, session_a):
        r = session_a.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == USER_A["email"]

        r2 = requests.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_logout_clears_cookies(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]})
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # After logout /me should be 401
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 401


# ---------- Isolation ----------
class TestIsolation:
    def test_a_creates_device_and_geofence(self, user_a_device, user_a_geofence):
        assert user_a_device["code"]
        assert len(user_a_device["code"]) == 6
        assert user_a_geofence["enabled"] is True

    def test_a_can_post_public_location_and_track_appears(self, session_a, user_a_device, user_a_geofence):
        code = user_a_device["code"]
        # point 1 — outside geofence
        r1 = requests.post(f"{API}/devices/by-code/{code}/location",
                           json={"lat": 10.05, "lng": 10.05, "speed": 1.2, "battery": 88})
        assert r1.status_code == 200, r1.text
        # point 2 — inside geofence (enter event)
        r2 = requests.post(f"{API}/devices/by-code/{code}/location",
                           json={"lat": 10.001, "lng": 10.001, "speed": 0.5, "battery": 87})
        assert r2.status_code == 200, r2.text
        body = r2.json()
        # An enter event should be emitted (crossed perimeter)
        assert isinstance(body.get("events"), list)
        assert any(e["type"] == "enter" and e["geofence_id"] == user_a_geofence["id"] for e in body["events"]), body

        # Track is visible to A
        r3 = session_a.get(f"{API}/devices/{user_a_device['id']}/track")
        assert r3.status_code == 200
        pts = r3.json()
        assert len(pts) >= 2

        # Events visible to A
        r4 = session_a.get(f"{API}/events")
        assert r4.status_code == 200
        events = r4.json()
        assert any(e["device_id"] == user_a_device["id"] and e["type"] == "enter" for e in events)

    def test_b_sees_empty_lists(self, session_b):
        for path in ("/devices", "/geofences", "/events"):
            r = session_b.get(f"{API}{path}")
            assert r.status_code == 200, f"{path}: {r.status_code}"
            assert r.json() == [], f"{path} not empty for user B: {r.json()}"

    def test_b_cannot_read_a_by_code_or_id(self, session_b, user_a_device):
        code = user_a_device["code"]
        r1 = session_b.get(f"{API}/devices/by-code/{code}")
        assert r1.status_code == 404
        r2 = session_b.get(f"{API}/devices/{user_a_device['id']}")
        assert r2.status_code == 404
        r3 = session_b.get(f"{API}/devices/{user_a_device['id']}/track")
        assert r3.status_code == 404

    def test_b_cannot_update_or_delete_a_device(self, session_b, user_a_device):
        r1 = session_b.patch(f"{API}/devices/{user_a_device['id']}", json={"name": "hijack"})
        assert r1.status_code == 404
        r2 = session_b.delete(f"{API}/devices/{user_a_device['id']}")
        assert r2.status_code == 404

    def test_auth_required_on_write_endpoints(self):
        # unauthenticated calls to protected endpoints must be 401
        anon = requests.Session()
        assert anon.get(f"{API}/devices").status_code == 401
        assert anon.post(f"{API}/devices", json={"name": "x"}).status_code == 401
        assert anon.get(f"{API}/geofences").status_code == 401
        assert anon.post(f"{API}/geofences", json={"name": "x", "lat": 0, "lng": 0, "radius": 100}).status_code == 401
        assert anon.get(f"{API}/events").status_code == 401


# ---------- Public tracker endpoints ----------
class TestPublicEndpoints:
    def test_public_device_by_code_returns_basic_only(self, user_a_device):
        code = user_a_device["code"]
        r = requests.get(f"{API}/devices/by-code/{code}/public")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == user_a_device["id"]
        assert d["name"] == user_a_device["name"]
        assert d["code"] == code
        assert "color" in d
        # Must NOT expose sensitive fields
        assert "user_id" not in d
        assert "last_lat" not in d
        assert "last_lng" not in d
        assert "last_seen" not in d

    def test_public_invalid_code_404(self):
        r = requests.get(f"{API}/devices/by-code/ZZZZZZ/public")
        assert r.status_code == 404

    def test_public_location_post_works_without_auth(self, user_a_device):
        code = user_a_device["code"]
        r = requests.post(f"{API}/devices/by-code/{code}/location",
                          json={"lat": 12.34, "lng": 56.78, "speed": 3.0})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_public_location_invalid_code_404(self):
        r = requests.post(f"{API}/devices/by-code/ZZZZZZ/location", json={"lat": 1, "lng": 2})
        assert r.status_code == 404


# ---------- Admin login sanity ----------
def test_admin_login():
    s = new_session()
    r = s.post(f"{API}/auth/login", json={"email": "admin@trailbeacon.app", "password": "admin123"})
    assert r.status_code == 200
    assert r.json()["email"] == "admin@trailbeacon.app"


# ---------- Cleanup ----------
@pytest.fixture(scope="module", autouse=True)
def _cleanup(request, session_a):
    yield
    # attempt to remove A's created device
    try:
        r = session_a.get(f"{API}/devices")
        for d in r.json():
            session_a.delete(f"{API}/devices/{d['id']}")
        r2 = session_a.get(f"{API}/geofences")
        for g in r2.json():
            session_a.delete(f"{API}/geofences/{g['id']}")
    except Exception:
        pass
