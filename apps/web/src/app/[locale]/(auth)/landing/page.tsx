'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Image from 'next/image';

const LANGUAGES = [
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿', nativeName: 'Azərbaycanca' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', nativeName: 'Türkçe' },
];

// GL-01: Language selector + platform welcome screen
export default function LandingPage() {
  const router = useRouter();
  const currentLocale = useLocale();

  const handleLanguageSelect = (localeCode: string) => {
    router.push(`/${localeCode}/login`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pob-navy via-pob-blue to-pob-teal flex flex-col items-center justify-center p-4">
      {/* Logo / branding */}
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span className="text-4xl">⚓</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Port of Baku</h1>
        <p className="text-blue-200 text-lg mt-1 font-light">E-Queue Platform</p>
        <p className="text-blue-300 text-sm mt-3 max-w-xs mx-auto">
          Liman nəqliyyat əməliyyatları üçün rəqəmsal növbə idarəetmə sistemi
        </p>
      </div>

      {/* Language selection */}
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <p className="text-center text-gray-500 text-sm font-medium mb-4 uppercase tracking-wider">
          Select Language / Dil Seçin
        </p>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all hover:shadow-md ${
                currentLocale === lang.code
                  ? 'border-pob-blue bg-blue-50'
                  : 'border-gray-200 hover:border-pob-blue hover:bg-blue-50'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <div className="text-left">
                <p className="font-semibold text-gray-800 text-sm">{lang.nativeName}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-blue-300 text-xs mt-8">
        © {new Date().getFullYear()} Port of Baku. All rights reserved.
      </p>
    </div>
  );
}
