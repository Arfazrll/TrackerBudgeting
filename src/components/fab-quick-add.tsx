"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type Book = { id: string; name: string; type: "PERSONAL" | "SHARED" };

export default function FabQuickAdd() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isStandaloneQuickAddRoute = pathname === "/quick-add" || (pathname?.startsWith("/books/") && searchParams.get("action") === "add-transaction");
  if (isStandaloneQuickAddRoute) return null;

  const bookMatch = pathname?.match(/\/books\/([-_a-zA-Z0-9]+)/);
  const currentBookId = bookMatch ? bookMatch[1] : null;
  const currentBookType = books.find((book) => book.id === currentBookId)?.type ?? "PERSONAL";

  function openQuickAdd() {
    const nextType = currentBookType.toLowerCase();
    router.push(`/quick-add?type=${nextType}`);
  }

  return (
    <button
      type="button"
      onClick={openQuickAdd}
      aria-label={t("workspace.quickAdd")}
      className="fixed right-4 bottom-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-transform hover:bg-[var(--primary-hover)] active:scale-95 md:right-8 md:bottom-8 dark:text-[#00150b]"
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus size={22} />}
    </button>
  );
}
