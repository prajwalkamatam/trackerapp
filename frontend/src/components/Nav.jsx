import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Radar, MapPin, Radio, ListChecks, Bell, Cpu, LogOut, LogIn as LogInIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/dashboard", label: "Ops", icon: Radar },
  { to: "/devices", label: "Devices", icon: Cpu },
  { to: "/geofences", label: "Geofences", icon: MapPin },
  { to: "/events", label: "Alerts", icon: Bell },
  { to: "/tracker", label: "Tracker", icon: Radio },
];

export default function Nav() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  // Hide on landing/login/register — those pages are their own layout
  if (loc.pathname === "/" || loc.pathname === "/login" || loc.pathname === "/register") return null;

  const doLogout = async () => {
    await logout();
    toast.success("Signed out");
    nav("/login");
  };

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
          <span className="overline hidden sm:inline">v0.2</span>
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
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          <div className="ml-2 flex items-center gap-2 border-l border-zinc-800 pl-2">
            {user && typeof user === "object" ? (
              <>
                <span data-testid="nav-user" className="hidden font-mono text-[10px] text-zinc-400 sm:inline">
                  {user.email}
                </span>
                <button
                  data-testid="nav-logout"
                  onClick={doLogout}
                  className="flex items-center gap-1.5 border border-zinc-800 px-2 py-1.5 text-[10px] uppercase tracking-widest text-zinc-400 hover:border-amber-500 hover:text-amber-400"
                  title="Sign out"
                >
                  <LogOut size={12} /> <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                data-testid="nav-login"
                className="flex items-center gap-1.5 border border-zinc-800 px-2 py-1.5 text-[10px] uppercase tracking-widest text-zinc-400 hover:border-amber-500 hover:text-amber-400"
              >
                <LogInIcon size={12} /> Sign in
              </NavLink>
            )}
          </div>
        </div>
      </div>
      <div className="tape-stripe" />
    </nav>
  );
}
