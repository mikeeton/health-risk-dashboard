import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, UserCog, Users } from "lucide-react";

import {
  activateAdminUser,
  getAdminUsers,
  suspendAdminUser,
} from "../services/api";

type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      setUsers(data);
    } catch {
      setMessage("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: UserRecord) {
    try {
      if (user.status === "active") {
        await suspendAdminUser(user.id);
      } else {
        await activateAdminUser(user.id);
      }

      await loadUsers();
    } catch {
      setMessage("Could not update user status.");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === "active").length,
    [users]
  );

  const clinicalUsers = useMemo(
    () => users.filter((user) => ["doctor", "nurse"].includes(user.role)).length,
    [users]
  );

  return (
    <div className="dashboard-shell space-y-6">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-blue-600" />

            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-slate-500">
                Review account roles and access status.
              </p>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
            {message}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <Users className="mb-3 h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold">{users.length}</h3>
          <p className="text-sm text-slate-500">Total users</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <Users className="mb-3 h-6 w-6 text-green-600" />
          <h3 className="text-2xl font-bold">{activeUsers}</h3>
          <p className="text-sm text-slate-500">Active accounts</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <Users className="mb-3 h-6 w-6 text-slate-600" />
          <h3 className="text-2xl font-bold">{clinicalUsers}</h3>
          <p className="text-sm text-slate-500">Clinical staff</p>
        </div>
      </section>

      <section className="glass-card overflow-hidden rounded-3xl">
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-bold">Accounts</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Access</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-6 py-4 font-medium">{user.full_name}</td>
                  <td className="px-6 py-4 text-slate-500">{user.email}</td>
                  <td className="px-6 py-4 capitalize">{user.role}</td>
                  <td className="px-6 py-4 capitalize">{user.status}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleUserStatus(user)}
                      disabled={user.role === "admin"}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {user.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}

              {!users.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    {loading ? "Loading users..." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
