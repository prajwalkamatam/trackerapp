import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs uppercase tracking-widest text-zinc-500">
        Authenticating…
      </div>
    );
  }
  if (user === false) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return children;
}
