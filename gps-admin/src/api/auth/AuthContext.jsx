import { createContext, useState, useContext } from "react";
export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { const t = localStorage.getItem("token"); return t ? { token: t } : null; });
  const login = (data) => { localStorage.setItem("token", data.accessToken || data.token); setUser(data.user || { token: data.accessToken }); };
  const logout = () => { localStorage.removeItem("token"); setUser(null); };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
