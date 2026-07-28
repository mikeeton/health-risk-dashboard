import { Link } from "react-router";
import { ClipboardCheck, GitPullRequest, Shield, UserPlus, Users } from "lucide-react";

const cards = [
  {
    title: "Users",
    subtitle: "Accounts and access status",
    path: "/admin/users",
    icon: Users,
  },
  {
    title: "Assignments",
    subtitle: "Doctor and nurse patient access",
    path: "/admin/assignments",
    icon: UserPlus,
  },
  {
    title: "Approvals",
    subtitle: "Pending access requests",
    path: "/admin/approvals",
    icon: ClipboardCheck,
  },
  {
    title: "Referrals",
    subtitle: "Review care access requests",
    path: "/admin/referrals",
    icon: GitPullRequest,
  },
  {
    title: "Audit Logs",
    subtitle: "Trace system activity",
    path: "/audit-logs",
    icon: Shield,
  },
];

export default function AdminDashboard() {
  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Manage accounts, approvals, assignments, and audit visibility.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.path}
              className="glass-card rounded-3xl p-6 transition hover:border-blue-400"
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
