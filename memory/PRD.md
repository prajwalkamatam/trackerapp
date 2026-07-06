# TrailBeacon — GPS Tracking Web App

## Original problem statement
"build an web app for gps tracking using our old mobile as tracking device"

## User choices captured
- Mobile → server: browser Geolocation API auto-sends
- Features: live map + trail + multi-device + telemetry (speed/altitude/battery) + geofencing + alerts
- Auth: none — devices are paired via a 6-character code
- Map: Leaflet + OpenStreetMap (CARTO dark tiles)
- Design: "Field-ops" dark theme (Chivo + JetBrains Mono, amber accent)

## Architecture
- Backend: FastAPI + Motor (Mongo), all routes under `/api`. Endpoints for devices, locations, geofences, events. Server-side haversine geofence transition detection on every location POST.
- Frontend: React + react-router-dom + react-leaflet + Tailwind + shadcn/ui + sonner toasts.
- Routes:
  - `/` Landing (marketing)
  - `/dashboard` Live ops console (map + fleet + alerts + telemetry)
  - `/tracker` and `/tracker/:code` Mobile beacon page (Geolocation API broadcaster)
  - `/devices` Fleet management (create/rename/delete, copy code/link)
  - `/geofences` Circular geofence editor on map (click to place, radius slider)
  - `/events` Alert history

## What's been implemented (Feb 2026)
- End-to-end pairing via 6-char code (auto-generated, unambiguous alphabet)
- Live location ingestion + trail history (240-min window, polyline per device color)
- Multi-device support with distinct trail colors and online/offline (60s threshold)
- Geofence create/toggle/delete with server-side enter/exit event generation
- Alerts panel on dashboard + full log at `/events`
- Battery reading (Battery Status API when available)
- All 6 pages verified via testing_agent_v3 (iteration_2: PASS)

## Known constraints
- React.StrictMode intentionally omitted (react-leaflet 4.x double-mount crash)
- Devices are anonymous — anyone holding the code can push locations

## Backlog (P1)
- Device sharing links with view-only vs. broadcaster split
- Polygon geofences (currently circles only)
- Historical playback slider (scrub through a time range)
- Push notifications for alerts
- Export track as GPX/KML

## Backlog (P2)
- Heatmap layer, clustering for many devices
- Offline tile caching for mobile broadcaster
- Simple PIN protection per device
