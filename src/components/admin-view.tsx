"use client";

import { BookOpen, Clock3, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { AdminUsers } from "@/components/admin-users";
import { useLanguage } from "@/contexts/language-context";

type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  _count: { ownedBooks: number; transactions: number };
  features: Array<"BOOKS" | "BUDGETING" | "PLANNING" | "POCKETS" | "NOTES">;
};

export function AdminView({ stats, users }: { stats: { users: number; pending: number; books: number; transactions: number }; users: User[] }) {
  const { t } = useLanguage();
  const cards = [
    { key: "admin.statUsers", value: stats.users, icon: Users, tone: "bg-blue-100 text-blue-700 dark:bg-blue-950" },
    { key: "admin.statPending", value: stats.pending, icon: Clock3, tone: "bg-amber-100 text-amber-700 dark:bg-amber-950" },
    { key: "admin.statBooks", value: stats.books, icon: BookOpen, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" },
    { key: "admin.statTransactions", value: stats.transactions, icon: ReceiptText, tone: "bg-violet-100 text-violet-700 dark:bg-violet-950" },
  ] as const;

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"><ShieldCheck size={17} /> {t("admin.pageTag")}</div>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em]">{t("admin.title")}</h1>
        <p className="mt-2 text-sm muted">{t("admin.subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, value, icon: Icon, tone }) => (
          <div key={key} className="card flex items-center justify-between p-5">
            <div><p className="text-xs muted">{t(key)}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
            <span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span>
          </div>
        ))}
      </div>
      <AdminUsers initialUsers={users} />
    </div>
  );
}
