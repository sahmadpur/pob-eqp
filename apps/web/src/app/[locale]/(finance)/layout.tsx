import { FinanceHeader } from '@/components/layout/finance-header';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <FinanceHeader />
      <main>{children}</main>
    </div>
  );
}
