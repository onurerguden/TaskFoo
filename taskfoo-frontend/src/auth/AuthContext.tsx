import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, logout as apiLogout, me as apiMe } from "../api/auth";

type User = { id: number; name: string; surname: string; email: string; roles: string[] } | null;

type AuthCtx = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Uygulama açıldığında, localStorage’da token varsa /me çek
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { setLoading(false); return; }
    (async () => {
      try {
        const u = await apiMe();
        setUser(u);
      } catch {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    await apiLogin(email, password);     // token localStorage’a yazılıyor
    const u = await apiMe();             // sonra kimim? -> menüde göstermek için
    setUser(u);
  };

  const logout = () => {
    apiLogout();                         // token’ı silip /login’e yönlendiriyor
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}