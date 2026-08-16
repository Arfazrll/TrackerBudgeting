import { FinanceBooksPage } from "@/components/finance-books-page";

export const metadata = { title: "Shared Finance" };

export default function SharedFinancePage() {
  return <FinanceBooksPage type="SHARED" />;
}
