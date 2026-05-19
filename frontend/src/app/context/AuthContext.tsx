import { createContext, useContext, useState } from "react";
import { loginUser } from "../services/api";

type UserRole = "admin" | "doctor" | "patient";

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const savedUser = localStorage.getItem("health-auth-user");
  const savedToken = localStorage.getItem("health-auth-token");

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

    localStorage.setItem("health-auth-user", JSON.stringify(data.user));
    localStorage.setItem("health-auth-token", data.access_token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("health-auth-user");
    localStorage.removeItem("health-auth-token");
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