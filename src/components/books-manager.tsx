"use client";

import { ArrowRight, BookOpen, KeyRound, LoaderCircle, LockKeyhole, Plus, Share2, Users, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SharedInviteControls } from "@/components/shared-invite-controls";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency } from "@/lib/format";

type Book = {
  id: string;
  name: string;
  description: string | null;
  type: "PERSONAL" | "SHARED";
  currency: string;
  inviteCode: string | null;
  inviteCodeExpiresAt: string | null;
  balance: number;
  owner: { id: string; name: string };
  members: Array<{ id: string }>;
  _count: { categories: number; transactions: number };
};

export function BooksManager({ books, scope }: { books: Book[]; scope?: "PERSONAL" | "SHARED" }) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdSharedBook, setCreatedSharedBook] = useState<Pick<Book, "id" | "name" | "inviteCode" | "inviteCodeExpiresAt"> | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      toast.success(t("books.createSuccess"));
      setMode(null);
      if (payload.book.type === "SHARED") {
        setCreatedSharedBook({
          id: payload.book.id,
          name: payload.book.name,
          inviteCode: payload.book.inviteCode,
          inviteCodeExpiresAt: payload.book.inviteCodeExpiresAt,
        });
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("books.createFail"));
    } finally {
      setLoading(false);
    }
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const inviteCode = new FormData(event.currentTarget).get("inviteCode");
    try {
      const response = await fetch("/api/books/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      toast.success(t("books.joinSuccess", { name: payload.bookName }));
      router.push(`/books/${payload.bookId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("books.joinFail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("books.pageTag")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            {scope === "PERSONAL" ? t("enterprise.books.personalTitle") : scope === "SHARED" ? t("enterprise.books.sharedTitle") : t("books.title")}
          </h1>
          <p className="mt-1.5 text-sm muted">
            {scope === "PERSONAL" ? t("enterprise.books.personalSubtitle") : scope === "SHARED" ? t("enterprise.books.sharedSubtitle") : t("books.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {scope !== "PERSONAL" && <button onClick={() => setMode("join")} className="btn-secondary"><Share2 size={17} /> {t(scope === "SHARED" ? "books.joinWithCode" : "books.enterCode")}</button>}
          <button onClick={() => setMode("create")} className="btn-primary">
            {scope === "SHARED" ? <KeyRound size={17} /> : <Plus size={17} />}
            {t(scope === "SHARED" ? "books.generateCode" : "books.createBook")}
          </button>
        </div>
      </div>
      {books.length ? (
        <div className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {books.map((book) => (
            <article key={book.id} className="card overflow-hidden transition-colors hover:border-emerald-400">
              <Link href={`/books/${book.id}`} className="group block p-4 active:bg-[var(--card-muted)] sm:p-5">
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:size-12">
                    {book.type === "SHARED" ? <Users size={20} /> : <LockKeyhole size={20} />}
                  </span>
                  <span className="rounded-full bg-[var(--card-muted)] px-2.5 py-1 text-[0.65rem] font-semibold muted">
                    {book.type === "SHARED" ? t("books.membersCount", { count: book.members.length }) : t("common.personal")}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 sm:mt-5">
                  <h2 className="min-w-0 truncate text-base font-bold sm:text-lg">{book.name}</h2>
                  <ArrowRight className="shrink-0 muted transition-transform group-hover:translate-x-0.5" size={17} />
                </div>
                <p className="mt-1 line-clamp-2 min-h-9 text-sm leading-5 muted">{book.description || t("common.noDescription")}</p>
                <div className="mt-5 border-t pt-4">
                  <p className="text-xs muted">{t("books.netBalance")}</p>
                  <p className={`mt-1 text-lg font-bold sm:text-xl ${book.balance < 0 ? "text-red-600" : ""}`}>{formatCurrency(book.balance, book.currency, locale)}</p>
                  <div className="mt-2.5 flex gap-4 text-xs muted">
                    <span>{book._count.transactions} {t("books.transactions").toLowerCase()}</span>
                    <span>{book._count.categories} {t("books.categories").toLowerCase()}</span>
                  </div>
                </div>
              </Link>
              {book.type === "SHARED" && (
                <div className="border-t p-4 sm:p-5">
                  <SharedInviteControls
                    bookId={book.id}
                    initialCode={book.inviteCode}
                    initialExpiresAt={book.inviteCodeExpiresAt}
                    compact
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="card mt-6 grid min-h-72 place-items-center p-8 text-center sm:mt-7 sm:min-h-80">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 sm:size-16"><BookOpen size={26} /></span>
            <h2 className="mt-4 text-base font-bold sm:mt-5 sm:text-lg">{t(scope === "SHARED" ? "books.sharedEmptyTitle" : "books.emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 muted">{t(scope === "SHARED" ? "books.sharedEmptyText" : "books.emptyText")}</p>
            <button onClick={() => setMode("create")} className="btn-primary mt-4 sm:mt-5">
              {scope === "SHARED" ? <KeyRound size={17} /> : <Plus size={17} />}
              {t(scope === "SHARED" ? "books.generateCode" : "books.createFirst")}
            </button>
          </div>
        </div>
      )}
      {mode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
          <div className="card max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">
                  {mode === "create" ? t(scope === "SHARED" ? "books.generateTitle" : "books.createTitle") : t("books.joinTitle")}
                </h2>
                <p className="mt-1 text-sm leading-6 muted">
                  {mode === "create" ? t(scope === "SHARED" ? "books.generateSubtitle" : "books.createSubtitle") : t("books.joinSubtitle")}
                </p>
              </div>
              <button aria-label={t("common.close")} onClick={() => setMode(null)} className="grid size-11 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            {scope === "SHARED" && (
              <div className="mt-5 grid grid-cols-2 rounded-xl bg-[var(--card-muted)] p-1">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mode === "create" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "muted"}`}
                >
                  <KeyRound size={16} className="mr-1.5 inline" /> {t("books.generateCode")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("join")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mode === "join" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "muted"}`}
                >
                  <Share2 size={16} className="mr-1.5 inline" /> {t("books.joinWithCode")}
                </button>
              </div>
            )}
            {mode === "create" ? (
              <form onSubmit={create} className={`${scope === "SHARED" ? "mt-4" : "mt-5"} space-y-4`}>
                <div><label className="label">{t("books.bookName")}</label><input name="name" required minLength={2} maxLength={80} className="input" placeholder={t("books.bookNamePlaceholder")} /></div>
                <div><label className="label">{t("common.description")}</label><textarea name="description" maxLength={240} rows={2} className="input resize-none" placeholder={t("books.descriptionPlaceholder")} /></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">{t("books.bookType")}</label>
                    {scope ? (
                      <>
                        <input type="hidden" name="type" value={scope} />
                        <div className="input flex items-center">{scope === "PERSONAL" ? t("common.personal") : t("common.shared")}</div>
                      </>
                    ) : (
                      <select name="type" className="input"><option value="PERSONAL">{t("common.personal")}</option><option value="SHARED">{t("common.shared")}</option></select>
                    )}
                  </div>
                  <div><label className="label">{t("common.currency")}</label><select name="currency" className="input"><option>IDR</option><option>USD</option><option>SGD</option><option>MYR</option></select></div>
                </div>
                <button disabled={loading} className="btn-primary w-full">
                  {loading ? <LoaderCircle size={17} className="animate-spin" /> : scope === "SHARED" ? <KeyRound size={17} /> : <Plus size={17} />}
                  {t(scope === "SHARED" ? "books.generateBtn" : "books.createBtn")}
                </button>
              </form>
            ) : (
              <form onSubmit={join} className={`${scope === "SHARED" ? "mt-4" : "mt-5"} space-y-4`}>
                <div>
                  <label className="label" htmlFor="join-invite-code">{t("books.inviteCodeLabel")}</label>
                  <div className="flex min-h-14 items-center overflow-hidden rounded-xl border bg-[var(--card)] transition-[border-color,box-shadow] focus-within:border-emerald-500 focus-within:shadow-[0_0_0_3px_rgb(34_197_94_/_0.12)]">
                    <span aria-hidden="true" className="grid min-h-14 w-12 shrink-0 place-items-center border-r bg-[var(--card-muted)] muted">
                      <KeyRound size={18} />
                    </span>
                    <input
                      id="join-invite-code"
                      name="inviteCode"
                      required
                      minLength={10}
                      maxLength={10}
                      pattern="[A-Fa-f0-9]{10}"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base font-semibold uppercase tracking-[0.16em] outline-none"
                      placeholder={t("books.inviteCodePlaceholder")}
                      autoFocus
                    />
                  </div>
                </div>
                <button disabled={loading} className="btn-primary w-full">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <Share2 size={17} />} {t("books.joinBtn")}</button>
              </form>
            )}
          </div>
        </div>
      )}
      {createdSharedBook && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="card max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">{t("books.inviteReadyTitle")}</h2>
                <p className="mt-1 text-sm leading-6 muted">{t("books.inviteReadySubtitle", { name: createdSharedBook.name })}</p>
              </div>
              <button aria-label={t("common.close")} onClick={() => setCreatedSharedBook(null)} className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <div className="mt-5">
              <SharedInviteControls
                bookId={createdSharedBook.id}
                initialCode={createdSharedBook.inviteCode}
                initialExpiresAt={createdSharedBook.inviteCodeExpiresAt}
              />
            </div>
            <Link href={`/books/${createdSharedBook.id}`} onClick={() => setCreatedSharedBook(null)} className="btn-secondary mt-4 w-full">
              {t("books.openSharedBook")} <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
