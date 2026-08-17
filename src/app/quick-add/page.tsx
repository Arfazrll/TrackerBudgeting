import QuickAddModal from "@/components/quick-add-modal";

export default function QuickAddPage({ searchParams }: { searchParams?: { type?: string } }) {
  const type = (searchParams?.type === "shared" ? "SHARED" : searchParams?.type === "personal" ? "PERSONAL" : undefined) as any;

  return (
    <div className="min-h-screen bg-[#020817] text-slate-50">
      <QuickAddModal initialType={type} />
    </div>
  );
}
