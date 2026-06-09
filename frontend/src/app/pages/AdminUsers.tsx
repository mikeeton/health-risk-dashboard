import { useState } from "react";
import {
  Users,
  Shield,
  UserCog,
  Trash2,
  Edit,
} from "lucide-react";

type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
};

export default function AdminUsers() {
  const [users] = useState<UserRecord[]>([
    {
      id: 1,
      full_name: "Jerry Admin",
      email: "admin@example.com",
      role: "admin",
      status: "Active",
    },
    {
      id: 2,
      full_name: "Dr May",
      email: "doctor@example.com",
      role: "doctor",
      status: "Active",
    },
    {
      id: 3,
      full_name: "Nurse Sarah",
      email: "nurse@example.com",
      role: "nurse",
      status: "Active",
    },
    {
      id: 4,
      full_name: "Max",
      email: "max@example.com",
      role: "patient",
      status: "Active",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <UserCog className="h-8 w-8 text-blue-500" />

          <div>
            <h1 className="text-3xl font-bold">
              User Management
            </h1>

            <p className="text-slate-500">
              Manage users, roles and permissions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <Users className="mb-3 h-8 w-8 text-blue-500" />
          <h3 className="text-2xl font-bold">
            {users.length}
          </h3>
          <p className="text-slate-500">Total Users</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <Shield className="mb-3 h-8 w-8 text-green-500" />
          <h3 className="text-2xl font-bold">
            {users.filter(u => u.status === "Active").length}
          </h3>
          <p className="text-slate-500">Active Users</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <UserCog className="mb-3 h-8 w-8 text-purple-500" />
          <h3 className="text-2xl font-bold">
            {users.filter(u => u.role === "doctor").length}
          </h3>
          <p className="text-slate-500">Doctors</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h2 className="mb-5 text-xl font-bold">
          System Users
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-100"
                >
                  <td className="p-3 font-medium">
                    {user.full_name}
                  </td>

                  <td className="p-3">
                    {user.email}
                  </td>

                  <td className="p-3">
                    <span className="rounded-xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                      {user.role}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="rounded-xl bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                      {user.status}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-blue-500 p-2 text-white">
                        <Edit size={16} />
                      </button>

                      <button className="rounded-lg bg-red-500 p-2 text-white">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}