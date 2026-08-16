import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link href="/dashboard" aria-label="ianda" className={`inline-flex items-center rounded-lg font-bold lowercase tracking-[-0.055em] ${compact ? "text-lg" : "text-2xl"}`}>
      ianda
    </Link>
  );
}
