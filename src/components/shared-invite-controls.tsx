"use client";

import { Check, Clock3, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { copyTextToClipboard } from "@/lib/clipboard";

type InviteState = {
  code: string | null;
  expiresAt: string | null;
};

function secondsUntil(expiresAt: string | null) {
  return expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SharedInviteControls({
  bookId,
  initialCode,
  initialExpiresAt,
  compact = false,
}: {
  bookId: string;
  initialCode: string | null;
  initialExpiresAt: string | null;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [invite, setInvite] = useState<InviteState>({ code: initialCode, expiresAt: initialExpiresAt });
  const [remaining, setRemaining] = useState(() => secondsUntil(initialExpiresAt));
  const [manualLoading, setManualLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(!initialCode);
  const [copied, setCopied] = useState(false);
  const inviteRef = useRef(invite);
  const requestInFlight = useRef(false);
  const retryAt = useRef(0);
  const copiedTimer = useRef<number | null>(null);

  const requestCode = useCallback(async (method: "POST" | "PUT", announce: boolean) => {
    if (requestInFlight.current || (method === "POST" && Date.now() < retryAt.current)) return;
    requestInFlight.current = true;
    if (method === "PUT") setManualLoading(true);
    if (!inviteRef.current.code || secondsUntil(inviteRef.current.expiresAt) === 0) setRefreshing(true);

    try {
      const response = await fetch(`/api/books/${bookId}/invite-code`, { method });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t("workspace.members.refreshFailed"));
      if (!payload.inviteCode || !payload.inviteCodeExpiresAt) {
        throw new Error(t("workspace.members.refreshFailed"));
      }

      const nextInvite = {
        code: String(payload.inviteCode),
        expiresAt: String(payload.inviteCodeExpiresAt),
      };
      inviteRef.current = nextInvite;
      setInvite(nextInvite);
      setRemaining(secondsUntil(nextInvite.expiresAt));
      retryAt.current = 0;
      if (announce) toast.success(t("workspace.members.codeGenerated"));
    } catch (error) {
      retryAt.current = Date.now() + 30_000;
      toast.error(error instanceof Error ? error.message : t("workspace.members.refreshFailed"));
    } finally {
      requestInFlight.current = false;
      setRefreshing(false);
      setManualLoading(false);
    }
  }, [bookId, t]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void requestCode("POST", false), 0);
    return () => window.clearTimeout(timeout);
  }, [requestCode]);

  useEffect(() => {
    if (!invite.expiresAt) return;
    const interval = window.setInterval(() => {
      const nextRemaining = secondsUntil(invite.expiresAt);
      setRemaining(nextRemaining);
      if (nextRemaining === 0) void requestCode("POST", false);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [invite.expiresAt, requestCode]);

  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
  }, []);

  async function copyCode() {
    if (!invite.code) return;
    try {
      await copyTextToClipboard(invite.code);
      setCopied(true);
      if (navigator.vibrate) navigator.vibrate(10);
      toast.success(t("workspace.members.codeCopied"));
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("workspace.members.copyFailed"));
    }
  }

  const unavailable = refreshing || !invite.code;

  return (
    <div>
      {!compact && <p className="mt-2 text-sm leading-6 muted">{t("workspace.members.inviteDesc")}</p>}
      <div className={`${compact ? "" : "mt-3"} flex min-h-10 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300`}>
        {refreshing ? <LoaderCircle className="animate-spin" size={15} /> : <Clock3 size={15} />}
        {refreshing
          ? t("workspace.members.refreshing")
          : t("workspace.members.expiresIn", { time: formatCountdown(remaining) })}
      </div>

      <div className="mt-3 rounded-xl border bg-[var(--card-muted)] p-3">
        <p className="select-all break-all text-center font-mono text-base font-bold tracking-[0.18em] sm:text-lg">
          {invite.code ?? "----------"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={copyCode} disabled={unavailable} className="btn-primary min-h-11 px-3">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {t(copied ? "workspace.members.copied" : "workspace.members.copyCode")}
        </button>
        <button type="button" onClick={() => void requestCode("PUT", true)} disabled={manualLoading} className="btn-secondary min-h-11 px-3">
          <RefreshCw size={16} className={manualLoading ? "animate-spin" : ""} />
          {t("workspace.members.generateCode")}
        </button>
      </div>

      {!compact && <p className="mt-3 text-xs leading-5 muted">{t("workspace.members.rotationHint")}</p>}
    </div>
  );
}
