"use client";

import { Camera, Check, CircleUserRound, Database, KeyRound, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { initials } from "@/lib/format";

type ProfileUser = {
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
};

const MAX_AVATAR_BYTES = 512 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

function SettingRow({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--card-muted)]"><Icon size={18} /></span>
      <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 muted">{text}</p></div>
    </div>
  );
}

export function SettingsView({ user }: { user: ProfileUser }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [saving, setSaving] = useState(false);

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error(t("enterprise.profile.invalidType"));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("enterprise.profile.tooLarge"));
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => toast.error(t("enterprise.profile.failed"));
    reader.readAsDataURL(file);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t("enterprise.profile.failed"));
      toast.success(t("enterprise.profile.success"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("enterprise.profile.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("settings.pageTag")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{t("settings.title")}</h1>
        <p className="mt-2 text-sm muted">{t("settings.subtitle")}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-5 sm:p-6">
          <form onSubmit={saveProfile}>
            <div className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={name} fill sizes="96px" unoptimized className="object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-2xl font-bold">{initials(name)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">{t("enterprise.profile.title")}</h2>
                <p className="mt-1 text-sm muted">{t("enterprise.profile.subtitle")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="btn-secondary min-h-9 cursor-pointer py-2 text-xs">
                    <Camera size={15} /> {t("enterprise.profile.upload")}
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectAvatar} />
                  </label>
                  {avatarUrl && (
                    <button type="button" onClick={() => setAvatarUrl(null)} className="btn-danger min-h-9 py-2 text-xs">
                      <Trash2 size={15} /> {t("enterprise.profile.remove")}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs muted">{t("enterprise.profile.helper")}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="display-name">{t("enterprise.profile.displayName")}</label>
                <input id="display-name" className="input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required />
              </div>
              <div>
                <label className="label" htmlFor="profile-email">{t("auth.email")}</label>
                <input id="profile-email" className="input opacity-70" value={user.email} disabled />
              </div>
            </div>
            <button className="btn-primary mt-5 w-full sm:w-auto" disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />}
              {t("enterprise.profile.save")}
            </button>
          </form>
          <div className="mt-7 border-t pt-6">
            <div className="space-y-4">
              <SettingRow icon={CircleUserRound} title={t("settings.identityTitle")} text={t("settings.identityText")} />
              <SettingRow icon={KeyRound} title={t("settings.credentialsTitle")} text={t("settings.credentialsText")} />
              <SettingRow icon={ShieldCheck} title={t("settings.activeTitle")} text={t("settings.activeText")} />
            </div>
          </div>
        </section>
        <section className="card h-fit p-5 sm:p-6">
          <Database className="text-emerald-600" size={22} />
          <h2 className="mt-4 font-bold">{t("settings.storageTitle")}</h2>
          <p className="mt-2 text-sm leading-6 muted">{t("settings.storageText")}</p>
          <div className="mt-5 rounded-xl bg-[var(--card-muted)] p-4 text-xs leading-6 muted">
            <strong className="text-[var(--foreground)]">{t("settings.privacyTitle")}</strong><br />
            {t("settings.privacyText")}
          </div>
        </section>
      </div>
    </div>
  );
}
