import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authLogin, authLogout, authMe, authRegister } from "@/lib/api";

const AuthContext = createContext(null);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  // null = checking, false = anonymous, object = authenticated
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const me = await authMe();
      setUser(me);
    } catch (_) {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const u = await authLogin(email, password);
    setUser(u);
    return u;
  };
  const register = async (email, password, name) => {
    const u = await authRegister(email, password, name);
    setUser(u);
    return u;
  };
  const logout = async () => {
    try {
      await authLogout();
    } catch (_) {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
