"use client";

import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/contexts/language-context";
import { cn, initials } from "@/lib/format";

type User = {
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
};

type NavItem = {
  href: string;
  key: string;
  icon: LucideIcon;
  notification?: boolean;
  mobileKey?: string;
};

type Feature = "BOOKS" | "BUDGETING" | "PLANNING" | "POCKETS" | "NOTES";

const overviewItems: NavItem[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
];

const financeItems: NavItem[] = [
  { href: "/books/personal", key: "enterprise.nav.personal", mobileKey: "enterprise.nav.personalShort", icon: UserRound },
  { href: "/books/shared", key: "enterprise.nav.shared", mobileKey: "enterprise.nav.sharedShort", icon: Share2 },
  { href: "/books", key: "nav.books", icon: BookOpen },
  { href: "/budgeting", key: "enterprise.nav.budgeting", icon: CircleDollarSign },
];

const toolItems: NavItem[] = [
  { href: "/planning", key: "enterprise.nav.planning", icon: Target },
  { href: "/pockets", key: "enterprise.nav.pockets", icon: PiggyBank },
  { href: "/notes", key: "enterprise.nav.notes", icon: NotebookPen },
  { href: "/notifications", key: "nav.notifications", icon: Bell, notification: true },
];

const systemItems: NavItem[] = [
  { href: "/settings", key: "nav.settings", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/books") {
    return /^\/books\/(?!personal(?:\/|$)|shared(?:\/|$))[^/]+/.test(pathname);
  }
  return href !== "/dashboard" && pathname.startsWith(`${href}/`);
}

function ProfileAvatar({ user, className }: { user: User; className?: string }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", className)}>
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" fill sizes="40px" unoptimized className="object-cover" />
      ) : initials(user.name)}
    </span>
  );
}

export function AppShell({ user, unread, features, children }: { user: User; unread: number; features: Feature[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((value) => !value);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ redirect: false });
    router.replace("/login");
    router.refresh();
  }

  const enabledFeatures = new Set(features);
  const visibleFinanceItems = financeItems.filter((item) =>
    item.href === "/books" ? enabledFeatures.has("BOOKS")
      : item.href === "/budgeting" ? enabledFeatures.has("BUDGETING")
        : true);
  const visibleToolItems = toolItems.filter((item) =>
    item.href === "/notifications" ? false
      : item.href === "/planning" ? enabledFeatures.has("PLANNING")
      : item.href === "/pockets" ? enabledFeatures.has("POCKETS")
        : item.href === "/notes" ? enabledFeatures.has("NOTES")
          : true);
  const navigationGroups: Array<{ label: string; items: NavItem[] }> = [
    ...(user.role === "ADMIN"
      ? [
          { label: "enterprise.nav.administration", items: [{ href: "/admin", key: "nav.admin", icon: ShieldCheck }] },
          { label: "enterprise.nav.system", items: [toolItems[3], ...systemItems] },
        ]
      : [
          { label: "enterprise.nav.overview", items: overviewItems },
          { label: "enterprise.nav.finance", items: visibleFinanceItems },
          ...(visibleToolItems.length ? [{ label: "enterprise.nav.tools", items: visibleToolItems }] : []),
          { label: "enterprise.nav.system", items: [toolItems[3], ...systemItems] },
        ]),
  ];

  const bottomNav: NavItem[] = user.role === "ADMIN"
    ? [{ href: "/admin", key: "nav.admin", icon: ShieldCheck }, toolItems[3], systemItems[0]]
    : [overviewItems[0], financeItems[0], financeItems[1], toolItems[3]];
  const currentGroup = navigationGroups.find((group) => group.items.some((item) => isActivePath(pathname, item.href))) ?? navigationGroups[0];
  const currentNavigation = currentGroup.items.find((item) => isActivePath(pathname, item.href)) ?? overviewItems[0];
  const CurrentPageIcon = currentNavigation.icon;

  function renderSidebar(compact: boolean) {
    return (
      <>
        <div className={cn("flex h-16 items-center border-b border-[var(--sidebar-border)] md:h-[4.5rem]", compact ? "justify-center px-2" : "px-5")}>
          <Brand compact={compact} />
        </div>
        <nav aria-label={t("nav.financialWorkspace")} className={cn("flex-1 overflow-y-auto py-4", compact ? "px-2" : "px-3")}>
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.label} className="mb-4">
              {!compact && (
                <p className="mb-2 px-3 text-[0.63rem] font-bold uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
                  {t(group.label)}
                </p>
              )}
              {compact && groupIndex > 0 && <div className="mx-2 mb-3 border-t border-[var(--sidebar-border)]" />}
              <div className="space-y-0.5">
                {group.items.map(({ href, key, icon: Icon, notification }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={compact ? t(key) : undefined}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group relative flex min-h-11 items-center overflow-hidden rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                        compact ? "justify-center px-2" : "gap-2.5 px-2.5",
                        active ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-foreground)]" : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-foreground)]",
                      )}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-emerald-500" />}
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors", active ? "bg-emerald-500/10" : "group-hover:bg-[var(--sidebar-hover)]")}>
                        <Icon size={17} />
                      </span>
                      {!compact && <span className="truncate">{t(key)}</span>}
                      {notification && unread > 0 && (
                        compact
                          ? <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-400" />
                          : <span className="ml-auto rounded-full bg-emerald-400 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-950">{unread}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className={cn("border-t border-[var(--sidebar-border)]", compact ? "p-2" : "p-3")}>
          <Link
            href="/settings"
            title={compact ? user.name : undefined}
            className={cn("flex min-h-11 items-center rounded-xl bg-[var(--sidebar-hover)] hover:opacity-80", compact ? "justify-center" : "gap-3 px-3 py-2.5")}
          >
            <ProfileAvatar user={user} className="size-8" />
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--sidebar-foreground)]">{user.name}</p>
                <p className="truncate text-[0.65rem] text-[var(--sidebar-muted)]">{user.email}</p>
              </div>
            )}
          </Link>
          <button
            onClick={logout}
            title={compact ? t("nav.signOut") : undefined}
            className={cn("mt-2 flex min-h-11 w-full items-center rounded-xl text-sm font-medium text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-foreground)]", compact ? "justify-center" : "gap-3 px-3")}
          >
            <LogOut size={18} className="shrink-0" />
            {!compact && t("nav.signOut")}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width] duration-200 md:flex", collapsed ? "w-20" : "w-64")}>
        {renderSidebar(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label={t("nav.closeMenu")}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(19rem,88vw)] flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-2xl">
            <button
              aria-label={t("nav.closeMenu")}
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-lg text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)]"
            >
              <X size={20} />
            </button>
            {renderSidebar(false)}
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-20" : "md:pl-64")}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-[color:var(--card)]/92 px-3 shadow-[0_1px_0_rgb(15_23_42/0.02)] backdrop-blur-xl sm:h-16 sm:px-5 md:h-[4.5rem] md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label={t("nav.openMenu")}
              className="grid size-11 place-items-center rounded-xl border bg-[var(--card)] active:scale-95 md:hidden"
            >
              <Menu size={19} />
            </button>
            <button
              onClick={toggleCollapsed}
              aria-label={t(collapsed ? "enterprise.nav.expand" : "enterprise.nav.collapse")}
              title={t(collapsed ? "enterprise.nav.expand" : "enterprise.nav.collapse")}
              className="hidden size-10 place-items-center rounded-xl border bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-muted)] hover:text-[var(--foreground)] md:grid"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div className="hidden min-w-0 items-center gap-3 sm:flex">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CurrentPageIcon size={17} /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t(currentNavigation.key)}</p>
                <p className="flex items-center gap-1 text-[0.68rem] muted"><span>iaNda</span><ChevronRight size={11} /><span>{t(currentGroup.label)}</span></p>
              </div>
            </div>
            <div className="sm:hidden"><Brand /></div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              href="/notifications"
              aria-label={`${t("nav.notifications")} (${unread})`}
              className="relative hidden size-10 place-items-center rounded-xl border bg-[var(--card)] hover:bg-[var(--card-muted)] md:grid"
            >
              <Bell size={17} />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-[var(--card)]" />}
            </Link>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
                aria-label={t("nav.settings")}
                className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-[var(--card-muted)] active:scale-95"
              >
                <ProfileAvatar user={user} className="size-9" />
                <span className="hidden text-left lg:block">
                  <span className="block max-w-32 truncate text-xs font-semibold">{user.name}</span>
                  <span className="block text-[0.65rem] muted">
                    {user.role === "ADMIN" ? t("common.administrator") : t("common.user")}
                  </span>
                </span>
                <ChevronDown size={13} className="hidden muted lg:block" />
              </button>
              {profileOpen && (
                <div className="card absolute right-0 mt-2 w-56 p-2 shadow-xl">
                  <div className="border-b px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs muted">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="mt-1.5 flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--card-muted)]"
                  >
                    <Settings size={15} /> {t("nav.settings")}
                  </Link>
                  <button
                    onClick={logout}
                    className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <LogOut size={15} /> {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 pb-28 sm:p-6 sm:pb-20 md:p-8 md:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-2xl border bg-[color:var(--card)]/95 p-1 shadow-[0_12px_40px_rgb(0_0_0/0.18)] backdrop-blur-xl md:hidden">
        <div className="grid grid-flow-col auto-cols-fr items-stretch gap-1">
          {bottomNav.map(({ href, key, mobileKey, icon: Icon, notification }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[0.62rem] font-semibold transition-colors active:scale-[0.98]",
                  active ? "bg-[var(--primary-soft)] text-emerald-700 dark:text-emerald-300" : "text-[var(--muted)] hover:bg-[var(--card-muted)]",
                )}
              >
                <span className="relative">
                  <Icon size={20} />
                  {notification && unread > 0 && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-red-500" />}
                </span>
                <span className="max-w-full truncate">{t(mobileKey ?? key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
