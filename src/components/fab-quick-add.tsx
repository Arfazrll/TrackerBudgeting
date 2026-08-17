"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type Book = { id: string; name: string; type: "PERSONAL" | "SHARED" };

export default function FabQuickAdd() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/books");
        if (!res.ok) return;
        const payload = await res.json();
        if (mounted) setBooks(payload.books ?? []);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function openForBook(bookId: string) {
    setOpen(false);
    // navigate to the book page and open transaction modal
    router.push(`/books/${bookId}?action=add-transaction`);
  }

  // if current path is a book page, derive bookId and show direct add option
  const bookMatch = pathname?.match(/\/books\/([-_a-zA-Z0-9]+)/);
  const currentBookId = bookMatch ? bookMatch[1] : null;

  return (
    <div>
      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("workspace.quickAdd")}
        className="fixed right-4 bottom-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-95 transition-transform md:right-8 md:bottom-8"
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>

      {/* Overlay sheet */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-t-xl bg-[var(--card)] p-4 shadow-2xl sm:rounded-xl sm:mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("workspace.quickAddTitle")}</h3>
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={16} /></button>
            </div>
            <p className="mt-1 text-sm muted">{t("workspace.quickAddDesc")}</p>

            <div className="mt-4 grid gap-2">
              {currentBookId && (
                <button onClick={() => openForBook(currentBookId)} className="btn-primary w-full">
                  {t("workspace.quickAddCurrentBook")}
                </button>
              )}

              {books.map((b) => (
                <button key={b.id} onClick={() => openForBook(b.id)} className="flex items-center justify-between rounded-lg border p-3 hover:bg-[var(--card-muted)]">
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs muted">{b.type === "SHARED" ? t("common.shared") : t("common.personal")}</div>
                  </div>
                  <div className="ml-2 text-emerald-600">{t("workspace.quickAddSelect")}</div>
                </button>
              ))}

              {loading && <div className="text-sm muted">{t("workspace.loading")}</div>}
              {!loading && !books.length && <div className="text-sm muted">{t("workspace.quickAddNoBooks")}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
