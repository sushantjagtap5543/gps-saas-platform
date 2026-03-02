import { createContext, useState, useContext } from "react";
export const AuthContext = createContext(null);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("token");
    return t ? { token: t } : null;
  });
  const login = (data) => {
    const token = data.accessToken || data.token;
    localStorage.setItem("token", token);
    setUser(data.user || { token });
  };
  const logout = () => { localStorage.removeItem("token"); setUser(null); };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
