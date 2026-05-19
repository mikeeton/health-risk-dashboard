import { useState } from "react";
import { useNavigate } from "react-router";
import { Activity } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("doctor@example.com");
  const [password, setPassword] = useState("Password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      await login(email, password);

      navigate("/");
    } catch (error) {
      console.error(error);
      setError("Invalid email or password. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Login</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Demo login: doctor@example.com / Password123
          </p>
        </div>
      </Card>
    </div>
  );
}