from dotenv import load_dotenv
load_dotenv()

import os
import logging
import math
import random
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict


ROOT_DIR = Path(__file__).parent
JWT_ALG = "HS256"

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="TrailBeacon GPS Tracking API")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_code(n: int = 6) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(alphabet) for _ in range(n))


# ---------- Auth helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALG)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=2592000, path="/")


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        try:
            oid = ObjectId(payload["sub"])
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid subject")
        user = await db.users.find_one({"_id": oid})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Data models ----------
class Device(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    code: str
    color: str = "#F59E0B"
    created_at: str = Field(default_factory=now_iso)
    last_seen: Optional[str] = None
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    last_speed: Optional[float] = None
    last_altitude: Optional[float] = None
    last_accuracy: Optional[float] = None
    last_heading: Optional[float] = None
    battery: Optional[float] = None


class DeviceCreate(BaseModel):
    name: str
    color: Optional[str] = "#F59E0B"


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class LocationIn(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = None
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    battery: Optional[float] = None
    ts: Optional[str] = None


class LocationPoint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    user_id: str
    lat: float
    lng: float
    speed: Optional[float] = None
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    battery: Optional[float] = None
    ts: str = Field(default_factory=now_iso)


class Geofence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    lat: float
    lng: float
    radius: float
    enabled: bool = True
    created_at: str = Field(default_factory=now_iso)


class GeofenceCreate(BaseModel):
    name: str
    lat: float
    lng: float
    radius: float


class GeofenceUpdate(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius: Optional[float] = None
    enabled: Optional[bool] = None


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    device_id: str
    device_name: str
    geofence_id: str
    geofence_name: str
    type: str
    ts: str = Field(default_factory=now_iso)
    lat: float
    lng: float


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


# ---------- Helpers ----------
def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1 = math.radians(lat1); p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def unique_device_code() -> str:
    for _ in range(30):
        c = gen_code(6)
        if not await db.devices.find_one({"code": c}):
            return c
    raise HTTPException(500, "Could not generate unique code")


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u.get("name")}


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "TrailBeacon"}


# ---------- Auth endpoints ----------
@api_router.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": (data.name or email.split("@")[0]).strip(),
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": doc["name"]}


@api_router.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name")}


@api_router.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------- Device endpoints (scoped by user) ----------
@api_router.post("/devices", response_model=Device)
async def create_device(data: DeviceCreate, user: dict = Depends(get_current_user)):
    code = await unique_device_code()
    device = Device(user_id=user["id"], name=data.name.strip() or "Untitled Tracker", code=code, color=data.color or "#F59E0B")
    await db.devices.insert_one(device.model_dump())
    return device


@api_router.get("/devices", response_model=List[Device])
async def list_devices(user: dict = Depends(get_current_user)):
    docs = await db.devices.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Device(**d) for d in docs]


@api_router.get("/devices/by-code/{code}", response_model=Device)
async def get_device_by_code(code: str, user: dict = Depends(get_current_user)):
    doc = await db.devices.find_one({"code": code.upper(), "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return Device(**doc)


@api_router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str, user: dict = Depends(get_current_user)):
    doc = await db.devices.find_one({"id": device_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return Device(**doc)


@api_router.patch("/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, data: DeviceUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.devices.find_one_and_update(
        {"id": device_id, "user_id": user["id"]}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Device not found")
    return Device(**res)


@api_router.delete("/devices/{device_id}")
async def delete_device(device_id: str, user: dict = Depends(get_current_user)):
    r = await db.devices.delete_one({"id": device_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Device not found")
    await db.locations.delete_many({"device_id": device_id})
    await db.events.delete_many({"device_id": device_id})
    return {"ok": True}


# ---------- Location ingestion (PUBLIC - identified by code) ----------
@api_router.post("/devices/by-code/{code}/location")
async def post_location(code: str, loc: LocationIn):
    device = await db.devices.find_one({"code": code.upper()}, {"_id": 0})
    if not device:
        raise HTTPException(404, "Device not found. Check the pairing code.")

    ts = loc.ts or now_iso()
    point = LocationPoint(
        device_id=device["id"],
        user_id=device["user_id"],
        lat=loc.lat, lng=loc.lng,
        speed=loc.speed, altitude=loc.altitude, accuracy=loc.accuracy,
        heading=loc.heading, battery=loc.battery, ts=ts,
    )
    await db.locations.insert_one(point.model_dump())

    await db.devices.update_one(
        {"id": device["id"]},
        {"$set": {
            "last_seen": ts, "last_lat": loc.lat, "last_lng": loc.lng,
            "last_speed": loc.speed, "last_altitude": loc.altitude,
            "last_accuracy": loc.accuracy, "last_heading": loc.heading,
            "battery": loc.battery,
        }},
    )

    events_created: List[dict] = []
    fences = await db.geofences.find({"enabled": True, "user_id": device["user_id"]}, {"_id": 0}).to_list(200)
    prev_lat = device.get("last_lat"); prev_lng = device.get("last_lng")

    for f in fences:
        d_now = haversine_m(loc.lat, loc.lng, f["lat"], f["lng"])
        inside_now = d_now <= f["radius"]
        if prev_lat is not None and prev_lng is not None:
            d_prev = haversine_m(prev_lat, prev_lng, f["lat"], f["lng"])
            inside_prev = d_prev <= f["radius"]
        else:
            inside_prev = inside_now

        if inside_now != inside_prev:
            ev = Event(
                user_id=device["user_id"],
                device_id=device["id"], device_name=device["name"],
                geofence_id=f["id"], geofence_name=f["name"],
                type="enter" if inside_now else "exit",
                ts=ts, lat=loc.lat, lng=loc.lng,
            )
            await db.events.insert_one(ev.model_dump())
            events_created.append(ev.model_dump())

    return {"ok": True, "device_id": device["id"], "events": events_created}


# Public pairing check — mobile broadcaster verifies a code without needing to be logged in.
@api_router.get("/devices/by-code/{code}/public")
async def get_device_public(code: str):
    doc = await db.devices.find_one({"code": code.upper()}, {"_id": 0, "user_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return {"id": doc["id"], "name": doc["name"], "code": doc["code"], "color": doc.get("color")}


@api_router.get("/devices/{device_id}/track", response_model=List[LocationPoint])
async def get_track(device_id: str, limit: int = 500, since_minutes: Optional[int] = None, user: dict = Depends(get_current_user)):
    dev = await db.devices.find_one({"id": device_id, "user_id": user["id"]}, {"_id": 0})
    if not dev:
        raise HTTPException(404, "Device not found")
    q: dict = {"device_id": device_id, "user_id": user["id"]}
    if since_minutes:
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=since_minutes)).isoformat()
        q["ts"] = {"$gte": cutoff}
    docs = await db.locations.find(q, {"_id": 0}).sort("ts", 1).to_list(limit)
    return [LocationPoint(**d) for d in docs]


# ---------- Geofences ----------
@api_router.post("/geofences", response_model=Geofence)
async def create_geofence(data: GeofenceCreate, user: dict = Depends(get_current_user)):
    g = Geofence(user_id=user["id"], **data.model_dump())
    await db.geofences.insert_one(g.model_dump())
    return g


@api_router.get("/geofences", response_model=List[Geofence])
async def list_geofences(user: dict = Depends(get_current_user)):
    docs = await db.geofences.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Geofence(**d) for d in docs]


@api_router.patch("/geofences/{gid}", response_model=Geofence)
async def update_geofence(gid: str, data: GeofenceUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.geofences.find_one_and_update(
        {"id": gid, "user_id": user["id"]}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Geofence not found")
    return Geofence(**res)


@api_router.delete("/geofences/{gid}")
async def delete_geofence(gid: str, user: dict = Depends(get_current_user)):
    r = await db.geofences.delete_one({"id": gid, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Geofence not found")
    return {"ok": True}


# ---------- Events ----------
@api_router.get("/events", response_model=List[Event])
async def list_events(limit: int = 100, user: dict = Depends(get_current_user)):
    docs = await db.events.find({"user_id": user["id"]}, {"_id": 0}).sort("ts", -1).to_list(limit)
    return [Event(**d) for d in docs]


app.include_router(api_router)

allowed = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.devices.create_index("code", unique=True)
    await db.devices.create_index("user_id")
    await db.geofences.create_index("user_id")
    await db.events.create_index([("user_id", 1), ("ts", -1)])
    await db.locations.create_index([("device_id", 1), ("ts", 1)])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@trailbeacon.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    # Migrate any legacy ownerless data to the admin account so nothing is lost
    admin = await db.users.find_one({"email": admin_email})
    if admin:
        aid = str(admin["_id"])
        for coll in ("devices", "geofences", "locations", "events"):
            await db[coll].update_many({"user_id": {"$exists": False}}, {"$set": {"user_id": aid}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
