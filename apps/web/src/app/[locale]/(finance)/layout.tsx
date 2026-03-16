import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { UserRole } from '@pob-eqp/shared';

// Finance layout — server-side role check
// Protects all /registrations/* and other Finance routes
export default async function FinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // In production, decode the access token from cookie to verify role.
  // During development, this layout just renders the children.
  // Full middleware-based RBAC is in src/middleware.ts
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Finance topbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚓</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Port of Baku EQP</p>
            <p className="text-xs text-amber-600 font-medium">Finance Officer Portal</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a
            href={`/${params.locale}/registrations`}
            className="text-gray-600 hover:text-pob-blue transition-colors"
          >
            Registrations
          </a>
          <a
            href={`/${params.locale}/dashboard`}
            className="text-gray-600 hover:text-pob-blue transition-colors"
          >
            Dashboard
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
