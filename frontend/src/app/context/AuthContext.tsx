import { createContext, useContext, useEffect, useState } from "react";
import {
  AUTH_EXPIRED_EVENT,
  AUTH_TOKEN_REFRESHED_EVENT,
  loginUser,
  logoutUser,
} from "../services/api";
import type { AuthUser } from "../types/api";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => void;
  isDoctor: boolean;
  isAdmin: boolean;
  isPatient: boolean;
  isNurse: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const savedUser = sessionStorage.getItem("health-auth-user");
  const savedToken = sessionStorage.getItem("health-auth-token");

  const [user, setUser] = useState<AuthUser | null>(
    savedUser ? JSON.parse(savedUser) : null
  );

  const [token, setToken] = useState<string | null>(savedToken);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };
    const handleRefreshed = (event: Event) => {
      const accessToken = (event as CustomEvent<{ accessToken: string }>).detail
        ?.accessToken;
      if (accessToken) setToken(accessToken);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleRefreshed);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleRefreshed);
    };
  }, []);

  const login = async (email: string, password: string, mfaCode?: string) => {
    const data = await loginUser({
      email,
      password,
      mfa_code: mfaCode || null,
    });

    setUser(data.user);
    setToken(data.access_token);

    sessionStorage.setItem("health-auth-user", JSON.stringify(data.user));
    sessionStorage.setItem("health-auth-token", data.access_token);
    if (data.csrf_token) sessionStorage.setItem("health-csrf-token", data.csrf_token);
    sessionStorage.removeItem("health-refresh-token");
  };

  const logout = () => {
    void logoutUser(sessionStorage.getItem("health-csrf-token"));
    setUser(null);
    setToken(null);

    sessionStorage.removeItem("health-auth-user");
    sessionStorage.removeItem("health-auth-token");
    sessionStorage.removeItem("health-refresh-token");
    sessionStorage.removeItem("health-csrf-token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isDoctor: user?.role === "doctor",
        isAdmin: user?.role === "admin",
        isPatient: user?.role === "patient",
        isNurse: user?.role === "nurse",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
