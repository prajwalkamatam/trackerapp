import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Play, Square, MapPin, Battery, Gauge, Mountain, Radio } from "lucide-react";
import { getDeviceByCode, postLocation } from "@/lib/api";

export default function Tracker() {
  const { code: routeCode } = useParams();
  const [code, setCode] = useState((routeCode || "").toUpperCase());
  const [device, setDevice] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [last, setLast] = useState(null);
  const [error, setError] = useState("");
  const [sentCount, setSentCount] = useState(0);
  const watchRef = useRef(null);
  const lastSentAt = useRef(0);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    if (routeCode) verifyCode(routeCode.toUpperCase());
    return () => stopBroadcast();
  }, [routeCode]);

  async function verifyCode(c) {
    setError("");
    try {
      const d = await getDeviceByCode(c);
      setDevice(d);
      toast.success(`Paired: ${d.name}`);
    } catch (e) {
      setDevice(null);
      setError("Invalid code. Ask the console to create a device.");
    }
  }

  async function sendPing(pos, battery) {
    try {
      const payload = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed ?? null,
        altitude: pos.coords.altitude ?? null,
        accuracy: pos.coords.accuracy ?? null,
        heading: pos.coords.heading ?? null,
        battery: battery ?? null,
      };
      await postLocation(codeRef.current, payload);
      setLast(payload);
      setSentCount((n) => n + 1);
    } catch (e) {
      setError("Send failed. Will retry.");
    }
  }

  async function readBattery() {
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        return Math.round(b.level * 100);
      }
    } catch (_) {
      // battery API unavailable
    }
    return null;
  }

  function startBroadcast() {
    if (!device) {
      toast.error("Verify the pairing code first");
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("This browser has no Geolocation API");
      return;
    }
    setBroadcasting(true);
    setError("");
    lastSentAt.current = 0;
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentAt.current < 3000) return; // throttle to ~1/3s
        lastSentAt.current = now;
        const battery = await readBattery();
        sendPing(pos, battery);
      },
      (err) => {
        setError(err.message || "Geolocation error");
        toast.error(err.message || "Geolocation error");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    toast.success("Broadcasting…");
  }

  function stopBroadcast() {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setBroadcasting(false);
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="overline mt-4">Mobile Tracker</div>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Beacon Setup</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Enter the 6-character pairing code from the console, then tap Start. Keep this tab open
        with the screen unlocked.
      </p>

      {/* Pair */}
      <div className="mt-6 border border-zinc-800 p-4">
        <div className="overline mb-2">Pairing code</div>
        <div className="flex gap-2">
          <input
            data-testid="tracker-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="flex-1 border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-lg uppercase tracking-[0.4em] text-amber-400 outline-none focus:border-amber-500"
          />
          <button
            data-testid="tracker-pair-btn"
            onClick={() => verifyCode(code)}
            disabled={code.length !== 6}
            className="bg-amber-500 px-4 text-xs font-bold uppercase tracking-widest text-black hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            Pair
          </button>
        </div>
        {device && (
          <div className="mt-3 text-xs text-emerald-400">
            ✓ Paired · <span className="font-bold">{device.name}</span>
          </div>
        )}
        {error && <div className="mt-3 text-xs text-red-400">{error}</div>}
      </div>

      {/* Broadcast */}
      <div className="mt-4 border border-zinc-800 p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span
            className="pulse-dot"
            style={{ background: broadcasting ? "#10B981" : "#52525B" }}
          />
          <div className="overline">
            {broadcasting ? "Broadcasting" : "Standby"}
          </div>
        </div>
        <div className="font-display mt-4 text-4xl font-bold tracking-tight">
          {broadcasting ? "LIVE" : "IDLE"}
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Pings sent: <span className="text-zinc-200">{sentCount}</span>
        </div>

        {broadcasting ? (
          <button
            data-testid="tracker-stop-btn"
            onClick={stopBroadcast}
            className="mt-6 flex w-full items-center justify-center gap-2 bg-red-500 py-4 text-sm font-bold uppercase tracking-widest text-black hover:bg-red-400"
          >
            <Square size={16} /> Stop broadcasting
          </button>
        ) : (
          <button
            data-testid="tracker-start-btn"
            onClick={startBroadcast}
            disabled={!device}
            className="mt-6 flex w-full items-center justify-center gap-2 bg-amber-500 py-4 text-sm font-bold uppercase tracking-widest text-black hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            <Play size={16} /> Start broadcasting
          </button>
        )}
      </div>

      {/* Last ping */}
      {last && (
        <div data-testid="tracker-last-ping" className="mt-4 border border-zinc-800 p-4 font-mono text-xs">
          <div className="overline mb-3">Last ping</div>
          <Row icon={MapPin} label="POS" value={`${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}`} />
          <Row icon={Gauge} label="SPEED" value={last.speed != null ? `${last.speed.toFixed(1)} m/s` : "—"} />
          <Row icon={Mountain} label="ALT" value={last.altitude != null ? `${last.altitude.toFixed(1)} m` : "—"} />
          <Row icon={Radio} label="ACC" value={last.accuracy != null ? `±${last.accuracy.toFixed(1)} m` : "—"} />
          <Row icon={Battery} label="BATT" value={last.battery != null ? `${last.battery}%` : "—"} />
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-zinc-800 py-1.5">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={12} /> {label}
      </div>
      <div className="text-zinc-100">{value}</div>
    </div>
  );
}
