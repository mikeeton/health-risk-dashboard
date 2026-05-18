import { Activity } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export default function Login() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 hover:shadow-lg transition">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Login</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="student@example.com"
              className="mt-2 w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              placeholder="********"
              className="mt-2 w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
            />
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Sign In
          </Button>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Demo authentication page for future AWS Cognito integration.
          </p>
        </div>
      </Card>
    </div>
  );
}