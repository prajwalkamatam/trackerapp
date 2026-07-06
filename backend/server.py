from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
import string
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="TrailBeacon GPS Tracking API")
api_router = APIRouter(prefix="/api")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def gen_code(n: int = 6) -> str:
    # Uppercase alphanumeric, unambiguous
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(alphabet) for _ in range(n))


# ---------- Models ----------
class Device(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    name: str
    lat: float
    lng: float
    radius: float  # meters
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
    device_id: str
    device_name: str
    geofence_id: str
    geofence_name: str
    type: str  # "enter" | "exit"
    ts: str = Field(default_factory=now_iso)
    lat: float
    lng: float


# ---------- Helpers ----------
def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def unique_device_code() -> str:
    for _ in range(20):
        c = gen_code(6)
        if not await db.devices.find_one({"code": c}):
            return c
    raise HTTPException(500, "Could not generate unique code")


# ---------- Device endpoints ----------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "TrailBeacon"}


@api_router.post("/devices", response_model=Device)
async def create_device(data: DeviceCreate):
    code = await unique_device_code()
    device = Device(name=data.name.strip() or "Untitled Tracker", code=code, color=data.color or "#F59E0B")
    await db.devices.insert_one(device.model_dump())
    return device


@api_router.get("/devices", response_model=List[Device])
async def list_devices():
    docs = await db.devices.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Device(**d) for d in docs]


@api_router.get("/devices/by-code/{code}", response_model=Device)
async def get_device_by_code(code: str):
    doc = await db.devices.find_one({"code": code.upper()}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return Device(**doc)


@api_router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    doc = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return Device(**doc)


@api_router.patch("/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, data: DeviceUpdate):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.devices.find_one_and_update(
        {"id": device_id}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Device not found")
    return Device(**res)


@api_router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    r = await db.devices.delete_one({"id": device_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Device not found")
    await db.locations.delete_many({"device_id": device_id})
    await db.events.delete_many({"device_id": device_id})
    return {"ok": True}


# ---------- Location ingestion ----------
@api_router.post("/devices/by-code/{code}/location")
async def post_location(code: str, loc: LocationIn):
    device = await db.devices.find_one({"code": code.upper()}, {"_id": 0})
    if not device:
        raise HTTPException(404, "Device not found. Check the pairing code.")

    ts = loc.ts or now_iso()
    point = LocationPoint(
        device_id=device["id"],
        lat=loc.lat,
        lng=loc.lng,
        speed=loc.speed,
        altitude=loc.altitude,
        accuracy=loc.accuracy,
        heading=loc.heading,
        battery=loc.battery,
        ts=ts,
    )
    await db.locations.insert_one(point.model_dump())

    await db.devices.update_one(
        {"id": device["id"]},
        {"$set": {
            "last_seen": ts,
            "last_lat": loc.lat,
            "last_lng": loc.lng,
            "last_speed": loc.speed,
            "last_altitude": loc.altitude,
            "last_accuracy": loc.accuracy,
            "last_heading": loc.heading,
            "battery": loc.battery,
        }},
    )

    # Geofence detection: compare previous state to current for each enabled fence
    events_created: List[dict] = []
    fences = await db.geofences.find({"enabled": True}, {"_id": 0}).to_list(200)
    prev_lat = device.get("last_lat")
    prev_lng = device.get("last_lng")

    for f in fences:
        d_now = haversine_m(loc.lat, loc.lng, f["lat"], f["lng"])
        inside_now = d_now <= f["radius"]
        if prev_lat is not None and prev_lng is not None:
            d_prev = haversine_m(prev_lat, prev_lng, f["lat"], f["lng"])
            inside_prev = d_prev <= f["radius"]
        else:
            inside_prev = inside_now  # no transition on first ping

        if inside_now != inside_prev:
            ev = Event(
                device_id=device["id"],
                device_name=device["name"],
                geofence_id=f["id"],
                geofence_name=f["name"],
                type="enter" if inside_now else "exit",
                ts=ts,
                lat=loc.lat,
                lng=loc.lng,
            )
            await db.events.insert_one(ev.model_dump())
            events_created.append(ev.model_dump())

    return {"ok": True, "device_id": device["id"], "events": events_created}


@api_router.get("/devices/{device_id}/track", response_model=List[LocationPoint])
async def get_track(device_id: str, limit: int = 500, since_minutes: Optional[int] = None):
    q: dict = {"device_id": device_id}
    if since_minutes:
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=since_minutes)).isoformat()
        q["ts"] = {"$gte": cutoff}
    docs = await db.locations.find(q, {"_id": 0}).sort("ts", 1).to_list(limit)
    return [LocationPoint(**d) for d in docs]


# ---------- Geofences ----------
@api_router.post("/geofences", response_model=Geofence)
async def create_geofence(data: GeofenceCreate):
    g = Geofence(**data.model_dump())
    await db.geofences.insert_one(g.model_dump())
    return g


@api_router.get("/geofences", response_model=List[Geofence])
async def list_geofences():
    docs = await db.geofences.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Geofence(**d) for d in docs]


@api_router.patch("/geofences/{gid}", response_model=Geofence)
async def update_geofence(gid: str, data: GeofenceUpdate):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.geofences.find_one_and_update(
        {"id": gid}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Geofence not found")
    return Geofence(**res)


@api_router.delete("/geofences/{gid}")
async def delete_geofence(gid: str):
    r = await db.geofences.delete_one({"id": gid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Geofence not found")
    return {"ok": True}


# ---------- Events ----------
@api_router.get("/events", response_model=List[Event])
async def list_events(limit: int = 100):
    docs = await db.events.find({}, {"_id": 0}).sort("ts", -1).to_list(limit)
    return [Event(**d) for d in docs]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
