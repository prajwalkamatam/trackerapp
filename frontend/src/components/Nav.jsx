import { Link, NavLink, useLocation } from "react-router-dom";
import { Radar, MapPin, Radio, ListChecks, Bell, Cpu } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Ops", icon: Radar },
  { to: "/devices", label: "Devices", icon: Cpu },
  { to: "/geofences", label: "Geofences", icon: MapPin },
  { to: "/events", label: "Alerts", icon: Bell },
  { to: "/tracker", label: "Tracker", icon: Radio },
];

export default function Nav() {
  const loc = useLocation();
  if (loc.pathname === "/") return null;
  return (
    <nav
      data-testid="app-nav"
      className="sticky top-0 z-40 border-b border-zinc-800 bg-[#09090B]/95 backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-brand">
          <div className="flex h-7 w-7 items-center justify-center bg-amber-500 text-black">
            <ListChecks size={16} />
          </div>
          <div className="font-display text-sm font-bold tracking-tight">TRAILBEACON</div>
          <span className="overline hidden sm:inline">v0.1</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                  isActive
                    ? "bg-amber-500 text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="tape-stripe" />
    </nav>
  );
}
