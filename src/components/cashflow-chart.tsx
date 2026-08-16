"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency } from "@/lib/format";
import { localeToIntl } from "@/lib/translations";

type Point = { date: string; income: number; expense: number };

export function CashflowChart({ title, data, currency }: { title: string; data: Point[]; currency: string }) {
  const { locale, t } = useLanguage();
  const chartData = data.map((point) => ({
    ...point,
    month: new Intl.DateTimeFormat(localeToIntl(locale), { month: "short" }).format(new Date(point.date)),
  }));
  const compact = new Intl.NumberFormat(localeToIntl(locale), { notation: "compact", maximumFractionDigits: 1 });

  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><h3 className="font-semibold">{title}</h3><p className="mt-0.5 text-xs muted">{t("enterprise.dashboard.trendSubtitle")}</p></div>
        <div className="flex items-center gap-3 text-[0.68rem] muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" />{t("charts.income")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-orange-500" />{t("charts.expense")}</span>
        </div>
      </div>
      <div className="h-56 sm:h-64" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={(value) => compact.format(Number(value))} width={42} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), currency, locale)}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
            />
            <Bar dataKey="income" name={t("charts.income")} fill="#10b981" radius={[5, 5, 0, 0]} />
            <Bar dataKey="expense" name={t("charts.expense")} fill="#f97316" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
