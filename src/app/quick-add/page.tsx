import QuickAddModal from "@/components/quick-add-modal";

export default function QuickAddPage({ searchParams }: { searchParams?: { type?: string } }) {
  const type = (searchParams?.type === "shared" ? "SHARED" : searchParams?.type === "personal" ? "PERSONAL" : undefined) as any;
  return <QuickAddModal initialType={type} />;
}
