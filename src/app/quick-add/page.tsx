import QuickAddModal from "@/components/quick-add-modal";

export default async function QuickAddPage({ searchParams }: { searchParams?: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const type = params?.type === "shared" ? "SHARED" : params?.type === "personal" ? "PERSONAL" : undefined;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <QuickAddModal initialType={type} />
    </div>
  );
}
