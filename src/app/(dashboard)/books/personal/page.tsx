import { FinanceBooksPage } from "@/components/finance-books-page";

export const metadata = { title: "Personal Finance" };

export default function PersonalFinancePage() {
  return <FinanceBooksPage type="PERSONAL" />;
}
