import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { API } from "../lib/api";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await API.get("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email: string, password: string) => {
    const { data } = await API.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    const { data } = await API.post("/auth/signup", {
      email,
      password,
      full_name: fullName,
    });
    localStorage.setItem("access_token", data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
