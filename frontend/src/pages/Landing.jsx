import { Link } from "react-router-dom";
import { ArrowUpRight, Radar, Smartphone, Shield, Wifi } from "lucide-react";

const HERO =
  "https://images.pexels.com/photos/10233033/pexels-photo-10233033.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=1600";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(245,158,11,0.35), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-6 py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-amber-500 text-black">
                <Radar size={18} />
              </div>
              <div>
                <div className="font-display text-lg font-bold tracking-tight">TRAILBEACON</div>
                <div className="overline">FIELD-OPS GPS · v0.1</div>
              </div>
            </div>
            <Link
              to="/dashboard"
              data-testid="launch-console-btn"
              className="hidden items-center gap-2 border border-zinc-700 px-4 py-2 text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-black sm:flex"
            >
              Launch Console <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Hero content */}
          <div className="mt-24 grid grid-cols-1 gap-10 lg:mt-40 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="overline mb-6 text-amber-400">// Turn any old phone into a beacon</div>
              <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tighter sm:text-6xl lg:text-7xl">
                Track anything, <br />
                <span className="text-amber-400">anywhere,</span> in real time.
              </h1>
              <p className="mt-8 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                TrailBeacon converts a spare phone into a live GPS transmitter. Pair with a 6-digit
                code, mount it in your car / bag / bike, and watch every heartbeat land on a dark
                topographic console — with breadcrumb trails, geofence alerts, and telemetry.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/dashboard"
                  data-testid="cta-open-dashboard"
                  className="group flex items-center justify-center gap-3 bg-amber-500 px-6 py-4 text-sm font-bold uppercase tracking-widest text-black hover:bg-amber-400"
                >
                  Open Ops Console
                  <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/tracker"
                  data-testid="cta-open-tracker"
                  className="flex items-center justify-center gap-3 border border-zinc-700 px-6 py-4 text-sm font-bold uppercase tracking-widest hover:border-amber-500 hover:text-amber-400"
                >
                  <Smartphone size={16} /> Set Up Old Phone
                </Link>
              </div>
            </div>

            {/* Right telemetry column */}
            <div className="lg:col-span-4">
              <div className="border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="overline mb-3">Live telemetry sample</div>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    ["LAT", "48.85831"],
                    ["LNG", "2.29441"],
                    ["ALT", "42.6 m"],
                    ["SPEED", "13.4 km/h"],
                    ["ACC", "±4.2 m"],
                    ["BATT", "78%"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-dashed border-zinc-800 py-1">
                      <span className="text-zinc-500">{k}</span>
                      <span className="text-zinc-100">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-emerald-400">
                  <span className="pulse-dot" style={{ background: "#10B981" }} />
                  Broadcasting · 2s ago
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="tape-stripe" />
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-[1400px] px-6 py-24">
        <div className="overline">Capabilities</div>
        <h2 className="font-display mt-2 max-w-3xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Built for people who lose things, watch dogs run, or trace weekend rides.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-px bg-zinc-800 md:grid-cols-3">
          {[
            {
              icon: Smartphone,
              title: "Zero-install broadcaster",
              body: "Open a URL on the old phone, enter code, tap Start. Uses the browser Geolocation API — no app store, no root.",
            },
            {
              icon: Radar,
              title: "Live map + breadcrumbs",
              body: "Dark tactical map, live pulsing markers, historical polyline trails, and per-device telemetry.",
            },
            {
              icon: Shield,
              title: "Geofences & alerts",
              body: "Draw circular zones. Get an alert the moment a device enters or leaves. Full event log kept for you.",
            },
            {
              icon: Wifi,
              title: "Multi-device",
              body: "Track a car, a bike, a family member's phone — all with unique colors, from one console.",
            },
            {
              icon: Radar,
              title: "Speed · altitude · battery",
              body: "Every ping carries velocity, altitude, GPS accuracy and battery level of the beacon.",
            },
            {
              icon: Shield,
              title: "Private by default",
              body: "No accounts. A device is only visible to whoever holds the 6-character pairing code.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-[#09090B] p-8">
              <Icon size={24} className="text-amber-400" />
              <h3 className="font-display mt-5 text-lg font-bold uppercase tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-900 bg-zinc-950/40">
        <div className="mx-auto max-w-[1400px] px-6 py-24">
          <div className="overline">Sequence</div>
          <h2 className="font-display mt-2 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Three moves to a live beacon.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              ["01", "Create device", "In the console, name your tracker. You get a unique 6-character pairing code."],
              ["02", "Open on old phone", "Visit /tracker on the old phone. Enter the code. Grant location permission."],
              ["03", "Watch it move", "Live position, trails, speed and alerts appear on the operations console in real time."],
            ].map(([n, t, b]) => (
              <div key={n} className="border border-zinc-800 bg-[#09090B] p-8">
                <div className="font-display text-5xl font-black text-amber-400">{n}</div>
                <div className="font-display mt-4 text-lg font-bold uppercase tracking-tight">{t}</div>
                <p className="mt-2 text-sm text-zinc-400">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              data-testid="footer-open-dashboard"
              className="flex items-center gap-2 bg-amber-500 px-6 py-4 text-sm font-bold uppercase tracking-widest text-black hover:bg-amber-400"
            >
              Enter the console <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 py-8">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 text-xs text-zinc-500">
          <div>© {new Date().getFullYear()} TrailBeacon · Field-ops GPS.</div>
          <div className="overline">Signal · Trail · Truth</div>
        </div>
      </footer>
    </div>
  );
}
