"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency } from "@/lib/format";
import { localeToIntl } from "@/lib/translations";

export function DashboardCharts({
  monthly,
  categories,
  currency,
}: {
  monthly: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string | null; value: number; color: string }>;
  currency: string;
}) {
  const { locale, t } = useLanguage();
  const chartData = monthly.map((item) => ({
    ...item,
    month: new Intl.DateTimeFormat(localeToIntl(locale), { month: "short" }).format(new Date(item.date)),
  }));

  return (
    <>
      <div className="card p-4 sm:p-5 lg:col-span-2">
        <div className="mb-5">
          <h3 className="font-semibold">{t("charts.cashflow")}</h3>
          <p className="mt-0.5 text-xs muted">{t("charts.cashflowSubtitle")}</p>
        </div>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                tickFormatter={(value) => `${Math.round(value / 1_000_000)}M`}
                width={36}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), currency, locale)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
              />
              <Bar dataKey="income" name={t("charts.income")} fill="#22c55e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="expense" name={t("charts.expense")} fill="#f97316" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="font-semibold">{t("charts.distribution")}</h3>
          <p className="mt-0.5 text-xs muted">{t("charts.distributionSubtitle")}</p>
        </div>
        {categories.length ? (
          <>
            <div className="h-44 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {categories.map((item) => (
                      <Cell key={`${item.name ?? "none"}-${item.color}`} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), currency, locale)}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {categories.slice(0, 4).map((item) => (
                <div key={`${item.name ?? "none"}-${item.color}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate">{item.name || t("common.noCategory")}</span>
                  </span>
                  <strong className="shrink-0">{formatCurrency(item.value, currency, locale)}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid h-56 place-items-center text-sm muted">{t("charts.noExpenses")}</div>
        )}
      </div>
    </>
  );
}
