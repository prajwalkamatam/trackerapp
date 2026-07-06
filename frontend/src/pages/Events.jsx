import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { listEvents } from "@/lib/api";

export default function Events() {
  const [events, setEvents] = useState([]);

  const refresh = async () => setEvents(await listEvents(200));

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <div className="overline mt-2">Signal Log</div>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Alert History</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Every geofence transition, most recent first. Refreshes every 5 seconds.
      </p>

      <div className="mt-6 border border-zinc-800">
        <div className="grid grid-cols-12 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500">
          <div className="col-span-2">Type</div>
          <div className="col-span-3">Device</div>
          <div className="col-span-3">Geofence</div>
          <div className="col-span-2">Position</div>
          <div className="col-span-2 text-right">Time</div>
        </div>
        {events.length === 0 && (
          <div data-testid="events-empty" className="p-8 text-center text-sm text-zinc-500">
            No events yet. Create a geofence and get moving.
          </div>
        )}
        {events.map((e) => (
          <div key={e.id} className="grid grid-cols-12 items-center border-b border-zinc-900 px-4 py-3 text-xs">
            <div className="col-span-2">
              <span
                className={`px-2 py-1 text-[10px] uppercase tracking-widest ${
                  e.type === "enter" ? "bg-emerald-500 text-black" : "bg-red-500 text-black"
                }`}
              >
                {e.type}
              </span>
            </div>
            <div className="col-span-3 font-bold">{e.device_name}</div>
            <div className="col-span-3">{e.geofence_name}</div>
            <div className="col-span-2 font-mono text-zinc-400">
              {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
            </div>
            <div className="col-span-2 text-right text-zinc-500">
              {formatDistanceToNow(new Date(e.ts), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
