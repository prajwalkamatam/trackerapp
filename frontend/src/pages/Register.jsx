import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useAuth, formatApiError } from "@/context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await register(email.trim().toLowerCase(), password, name.trim() || null);
      toast.success("Account created — welcome");
      nav("/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center p-6">
      <div className="overline">Create account</div>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">Register</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Your fleet, trails and geofences are isolated per account.
      </p>

      <form onSubmit={submit} data-testid="register-form" className="mt-6 space-y-3 border border-zinc-800 p-5">
        <div>
          <label className="overline">Display name (optional)</label>
          <input
            data-testid="register-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-500"
            placeholder="Rider One"
          />
        </div>
        <div>
          <label className="overline">Email</label>
          <input
            data-testid="register-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="overline">Password (min 6)</label>
          <input
            data-testid="register-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-500"
            placeholder="••••••••"
          />
        </div>
        {error && <div data-testid="register-error" className="text-xs text-red-400">{error}</div>}
        <button
          data-testid="register-submit"
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 bg-amber-500 py-3 text-sm font-bold uppercase tracking-widest text-black hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          <UserPlus size={16} /> {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="mt-4 text-xs text-zinc-400">
        Already have an account?{" "}
        <Link data-testid="link-login" to="/login" className="text-amber-400 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
