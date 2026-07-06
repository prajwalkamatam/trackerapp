import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createGeofence, deleteGeofence, listDevices, listGeofences, updateGeofence } from "@/lib/api";

function ClickCapture({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function Geofences() {
  const [fences, setFences] = useState([]);
  const [devices, setDevices] = useState([]);
  const [name, setName] = useState("Home Base");
  const [radius, setRadius] = useState(150);
  const [pending, setPending] = useState(null); // {lat, lng}

  const refresh = async () => {
    const [g, d] = await Promise.all([listGeofences(), listDevices()]);
    setFences(g);
    setDevices(d);
  };

  useEffect(() => {
    refresh();
  }, []);

  const center = useMemo(() => {
    const live = devices.find((d) => d.last_lat != null);
    if (live) return [live.last_lat, live.last_lng];
    if (fences.length) return [fences[0].lat, fences[0].lng];
    return [20, 0];
  }, [devices, fences]);

  const submit = async () => {
    if (!pending) {
      toast.error("Click on the map to pick a center point");
      return;
    }
    if (!name.trim()) {
      toast.error("Give it a name");
      return;
    }
    await createGeofence({ name: name.trim(), lat: pending.lat, lng: pending.lng, radius: Number(radius) });
    setPending(null);
    setName("Home Base");
    toast.success("Geofence created");
    refresh();
  };

  const remove = async (g) => {
    if (!window.confirm(`Delete geofence "${g.name}"?`)) return;
    await deleteGeofence(g.id);
    refresh();
  };

  const toggle = async (g) => {
    await updateGeofence(g.id, { enabled: !g.enabled });
    refresh();
  };

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <div className="overline mt-2">Perimeter Setup</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Geofences</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Click anywhere on the map to place a new fence center, then set its radius and save.
        </p>
        <div data-testid="geofence-map" className="mt-4 h-[68vh] border border-zinc-800">
          <MapContainer center={center} zoom={devices.some((d) => d.last_lat != null) ? 13 : 2} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap · &copy; CARTO'
            />
            <ClickCapture onClick={setPending} />
            {fences.map((g) => (
              <Circle
                key={g.id}
                center={[g.lat, g.lng]}
                radius={g.radius}
                pathOptions={{
                  color: g.enabled ? "#F59E0B" : "#71717A",
                  fillColor: g.enabled ? "#F59E0B" : "#71717A",
                  fillOpacity: 0.12,
                  weight: 1.5,
                }}
              />
            ))}
            {pending && (
              <>
                <Marker position={[pending.lat, pending.lng]} />
                <Circle
                  center={[pending.lat, pending.lng]}
                  radius={Number(radius)}
                  pathOptions={{ color: "#10B981", fillColor: "#10B981", fillOpacity: 0.12, weight: 2, dashArray: "6 4" }}
                />
              </>
            )}
          </MapContainer>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="border border-zinc-800 p-4">
          <div className="overline mb-2">New Fence</div>
          <label className="mt-2 block text-[10px] uppercase tracking-widest text-zinc-500">Name</label>
          <input
            data-testid="fence-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <label className="mt-3 block text-[10px] uppercase tracking-widest text-zinc-500">Radius (m): {radius}</label>
          <input
            data-testid="fence-radius-input"
            type="range"
            min="20"
            max="2000"
            step="10"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="mt-1 w-full accent-amber-500"
          />
          <div className="mt-2 text-[11px] text-zinc-500">
            {pending
              ? `Center: ${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`
              : "Tap the map to pick a center."}
          </div>
          <button
            data-testid="fence-submit"
            onClick={submit}
            className="mt-3 flex w-full items-center justify-center gap-2 bg-amber-500 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-amber-400"
          >
            <Plus size={14} /> Save fence
          </button>
        </div>

        <div className="border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2">
            <div className="overline">Active fences</div>
          </div>
          <div data-testid="fence-list" className="max-h-[50vh] overflow-auto">
            {fences.length === 0 && (
              <div className="p-4 text-xs text-zinc-500">No geofences yet.</div>
            )}
            {fences.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
                <div>
                  <div className="text-sm font-bold">{g.name}</div>
                  <div className="text-[10px] text-zinc-500">r={Math.round(g.radius)}m · {g.lat.toFixed(3)},{g.lng.toFixed(3)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`fence-toggle-${g.id}`}
                    onClick={() => toggle(g)}
                    className={`px-2 py-1 text-[10px] uppercase tracking-widest ${
                      g.enabled ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {g.enabled ? "on" : "off"}
                  </button>
                  <button
                    data-testid={`fence-delete-${g.id}`}
                    onClick={() => remove(g)}
                    className="border border-zinc-800 p-1.5 text-zinc-400 hover:border-red-500 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
