import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap } from "react-leaflet";
import { listDevices, listGeofences, getTrack, listEvents } from "@/lib/api";
import { pulseIcon } from "@/lib/leafletIcon";
import { formatDistanceToNow } from "date-fns";
import { Battery, Gauge, Mountain, Signal, Clock } from "lucide-react";

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const LIVE_ZOOM = 14;

function fmt(v, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toFixed(digits);
}

/**
 * Only pans/zooms the map the first time a live device appears.
 * After that the user is free to zoom/pan and we never override it.
 */
function InitialViewSetter({ liveCenter }) {
  const map = useMap();
  const donePan = useRef(false);
  useEffect(() => {
    if (donePan.current) return;
    if (liveCenter) {
      map.setView(liveCenter, LIVE_ZOOM, { animate: false });
      donePan.current = true;
    }
  }, [liveCenter, map]);
  return null;
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [events, setEvents] = useState([]);
  const [tracks, setTracks] = useState({});
  const [selected, setSelected] = useState(null);

  const refreshAll = async () => {
    try {
      const [d, g, e] = await Promise.all([listDevices(), listGeofences(), listEvents(50)]);
      setDevices(d);
      setGeofences(g);
      setEvents(e);
      setSelected((prev) => prev || (d.length ? d[0].id : null));
    } catch (_) {
      // silent
    }
  };

  const refreshTracks = async (devs) => {
    const map = {};
    await Promise.all(
      devs
        .filter((x) => x.last_lat != null)
        .map(async (x) => {
          try {
            const t = await getTrack(x.id, 240);
            map[x.id] = t;
          } catch (_) {
            // ignore per-device failures
          }
        }),
    );
    setTracks(map);
  };

  useEffect(() => {
    refreshAll();
    const i = setInterval(refreshAll, 4000);
    return () => clearInterval(i);
  }, []);

  const devicesKey = devices.map((d) => `${d.id}:${d.last_seen}`).join("|");
  useEffect(() => {
    if (devices.length) refreshTracks(devices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesKey]);

  const liveCenter = useMemo(() => {
    const live = devices.find((d) => d.last_lat != null);
    return live ? [live.last_lat, live.last_lng] : null;
  }, [devices]);

  const sel = devices.find((d) => d.id === selected) || null;

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="overline">Operations Console</div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Live Map</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="pulse-dot" style={{ background: "#10B981" }} />
            REFRESH · 4s
          </div>
        </div>
        <div data-testid="dashboard-map" className="relative h-[70vh] border border-zinc-800">
          {/* MapContainer is mounted ONCE. Never re-mount on state changes. */}
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap · &copy; CARTO'
            />
            <InitialViewSetter liveCenter={liveCenter} />
            {devices
              .filter((d) => d.last_lat != null)
              .map((d) => (
                <Marker
                  key={d.id}
                  position={[d.last_lat, d.last_lng]}
                  icon={pulseIcon(d.color || "#F59E0B")}
                  eventHandlers={{ click: () => setSelected(d.id) }}
                >
                  <Popup>
                    <div className="font-mono text-xs">
                      <div className="font-bold uppercase">{d.name}</div>
                      <div>
                        {fmt(d.last_lat)}, {fmt(d.last_lng)}
                      </div>
                      <div>speed {fmt(d.last_speed, 1)} m/s</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            {Object.entries(tracks).map(([did, pts]) => {
              const dev = devices.find((x) => x.id === did);
              if (!pts || pts.length < 2) return null;
              return (
                <Polyline
                  key={did}
                  positions={pts.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: dev?.color || "#F59E0B", weight: 3, opacity: 0.85 }}
                />
              );
            })}
            {geofences.map((g) => (
              <Circle
                key={g.id}
                center={[g.lat, g.lng]}
                radius={g.radius}
                pathOptions={{
                  color: g.enabled ? "#F59E0B" : "#71717A",
                  fillColor: g.enabled ? "#F59E0B" : "#71717A",
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: g.enabled ? undefined : "4 4",
                }}
              >
                <Popup>
                  <div className="font-mono text-xs">
                    <div className="font-bold uppercase">{g.name}</div>
                    <div>radius {Math.round(g.radius)} m</div>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>

        {sel && (
          <div
            data-testid="telemetry-strip"
            className="mt-3 grid grid-cols-2 gap-px border border-zinc-800 bg-zinc-800 md:grid-cols-5"
          >
            <StatCell icon={Signal} label="Selected" value={sel.name} big />
            <StatCell icon={Gauge} label="Speed" value={`${fmt(sel.last_speed, 1)} m/s`} />
            <StatCell icon={Mountain} label="Altitude" value={`${fmt(sel.last_altitude, 1)} m`} />
            <StatCell icon={Battery} label="Battery" value={sel.battery != null ? `${Math.round(sel.battery)}%` : "—"} />
            <StatCell
              icon={Clock}
              label="Last seen"
              value={sel.last_seen ? formatDistanceToNow(new Date(sel.last_seen), { addSuffix: true }) : "never"}
            />
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:col-span-1">
        <div className="border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2">
            <div className="overline">Fleet</div>
          </div>
          <div data-testid="device-list" className="max-h-[45vh] overflow-auto">
            {devices.length === 0 && (
              <div className="p-4 text-xs text-zinc-500">No devices yet. Create one in Devices.</div>
            )}
            {devices.map((d) => {
              const isOnline = d.last_seen && Date.now() - new Date(d.last_seen).getTime() < 60_000;
              return (
                <button
                  key={d.id}
                  data-testid={`device-row-${d.code}`}
                  onClick={() => setSelected(d.id)}
                  className={`flex w-full items-center justify-between border-b border-zinc-900 px-4 py-3 text-left hover:bg-zinc-900 ${
                    selected === d.id ? "bg-zinc-900" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: d.color || "#F59E0B" }} />
                    <div>
                      <div className="text-sm font-bold">{d.name}</div>
                      <div className="text-[10px] text-zinc-500">{d.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                    <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-zinc-600"}`} />
                    {isOnline ? "live" : "offline"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2">
            <div className="overline">Recent Alerts</div>
          </div>
          <div data-testid="alerts-panel" className="max-h-[35vh] overflow-auto">
            {events.length === 0 && <div className="p-4 text-xs text-zinc-500">No geofence events yet.</div>}
            {events.slice(0, 15).map((e) => (
              <div key={e.id} className="border-b border-zinc-900 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${
                      e.type === "enter" ? "bg-emerald-500 text-black" : "bg-red-500 text-black"
                    }`}
                  >
                    {e.type}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {formatDistanceToNow(new Date(e.ts), { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-bold">{e.device_name}</span>{" "}
                  <span className="text-zinc-500">→</span> <span>{e.geofence_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatCell({ icon: Icon, label, value, big }) {
  return (
    <div className="bg-[#09090B] p-4">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-amber-400" />
        <div className="overline">{label}</div>
      </div>
      <div className={`mt-2 font-mono ${big ? "text-base font-bold" : "text-sm"} truncate`}>{value}</div>
    </div>
  );
}
