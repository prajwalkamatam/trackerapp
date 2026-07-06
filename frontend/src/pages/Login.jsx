import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { useAuth, formatApiError } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Welcome back");
      nav(from, { replace: true });
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center p-6">
      <div className="overline">Console access</div>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Access your private fleet. Devices, trails and geofences are yours alone.
      </p>

      <form onSubmit={submit} data-testid="login-form" className="mt-6 space-y-3 border border-zinc-800 p-5">
        <div>
          <label className="overline">Email</label>
          <input
            data-testid="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="overline">Password</label>
          <input
            data-testid="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-500"
            placeholder="••••••••"
          />
        </div>
        {error && <div data-testid="login-error" className="text-xs text-red-400">{error}</div>}
        <button
          data-testid="login-submit"
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 bg-amber-500 py-3 text-sm font-bold uppercase tracking-widest text-black hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 text-xs text-zinc-400">
        No account yet?{" "}
        <Link data-testid="link-register" to="/register" className="text-amber-400 hover:underline">
          Create one
        </Link>
      </div>
    </div>
  );
}
