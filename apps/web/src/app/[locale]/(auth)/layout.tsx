'use client';

import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pob-navy to-pob-blue flex items-center justify-center p-4">
      {/* Language switcher — top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher variant="dark" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Port of Baku</h1>
          <p className="text-blue-200 mt-1">E-Queue Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">{children}</div>
      </div>
    </div>
  );
}
