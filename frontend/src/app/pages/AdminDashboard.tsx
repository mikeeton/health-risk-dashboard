import { Link } from "react-router";
import { Bell, Database, Shield, Users } from "lucide-react";

const cards = [
  {
    title: "Users",
    subtitle: "Manage platform accounts",
    path: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Logs",
    subtitle: "Review clinical actions",
    path: "/audit-logs",
    icon: Shield,
  },
  {
    title: "Database",
    subtitle: "View reports and system data",
    path: "/reports",
    icon: Database,
  },
  {
    title: "Notifications",
    subtitle: "Review access approvals",
    path: "/admin/approvals",
    icon: Bell,
  },
];

export default function AdminDashboard() {
  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Manage users, audit logs, system activity, and hospital operations.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.path}
              className="glass-card rounded-3xl p-6 transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
            >
              <Icon className="mb-5 h-8 w-8 text-blue-500" />
              <h2 className="text-xl font-extrabold">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{card.subtitle}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}