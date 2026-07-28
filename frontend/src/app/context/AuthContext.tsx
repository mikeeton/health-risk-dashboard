import { createContext, useContext, useState } from "react";
import { loginUser, logoutUser } from "../services/api";

type UserRole = "admin" | "doctor" | "patient" | "nurse";

type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
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

  const login = async (email: string, password: string) => {
    const data = await loginUser({
      email,
      password,
    });

    setUser(data.user);
    setToken(data.access_token);

    sessionStorage.setItem("health-auth-user", JSON.stringify(data.user));
    sessionStorage.setItem("health-auth-token", data.access_token);
    sessionStorage.setItem("health-refresh-token", data.refresh_token);
  };

  const logout = () => {
    void logoutUser(sessionStorage.getItem("health-refresh-token"));
    setUser(null);
    setToken(null);

    sessionStorage.removeItem("health-auth-user");
    sessionStorage.removeItem("health-auth-token");
    sessionStorage.removeItem("health-refresh-token");
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
