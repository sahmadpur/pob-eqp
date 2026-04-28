'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Crest } from '@/components/brand/crest';
import { WavePattern } from '@/components/brand/wave-pattern';

const LANGUAGES = [
  { code: 'az', label: 'Azərbaycan', native: 'Azərbaycanca', greeting: 'Xoş gəlmisiniz' },
  { code: 'en', label: 'English',    native: 'English',      greeting: 'Welcome' },
  { code: 'ru', label: 'Русский',    native: 'Русский',      greeting: 'Добро пожаловать' },
  { code: 'tr', label: 'Türkçe',     native: 'Türkçe',       greeting: 'Hoş geldiniz' },
];

// GL-01: Language selector + platform welcome screen
export default function LandingPage() {
  const router = useRouter();
  const currentLocale = useLocale();

  const handleLanguageSelect = (localeCode: string) => {
    router.push(`/${localeCode}/login`);
  };

  return (
    <div className="relative min-h-screen bg-ink-800 text-parchment-50 overflow-hidden flex flex-col">
      {/* Backdrop */}
      <WavePattern className="absolute inset-0 w-full h-full text-parchment-50 opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-800/85 to-ink-900" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 animate-fade-up">
        {/* Crest */}
        <span className="text-brass-300">
          <Crest className="w-20 h-20" strokeWidth={1} />
        </span>

        <p className="mt-6 eyebrow-brass text-brass-300/90">Caspian Gateway · Est. 1902</p>
        <h1 className="mt-3 font-display text-5xl sm:text-6xl tracking-tight text-parchment-50 text-center">
          Port of Baku
        </h1>
        <p className="mt-2 text-parchment-200/70 text-base font-light tracking-wide">
          E-Queue Platform
        </p>
        <p className="mt-5 max-w-md text-center text-parchment-200/60 text-sm leading-relaxed">
          Liman nəqliyyat əməliyyatları üçün rəsmi rəqəmsal növbə idarəetmə sistemi.
        </p>

        {/* Language selection card */}
        <div className="mt-10 w-full max-w-lg bg-parchment-50/95 backdrop-blur rounded-2xl shadow-admiralty-lg p-6 sm:p-7 text-ink">
          <p className="eyebrow text-center text-ink-400">
            Select Language · Dil Seçin · Выберите язык · Dil Seçin
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {LANGUAGES.map((lang) => {
              const active = currentLocale === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left
                    ${active
                      ? 'border-brass-400 bg-brass-50/60'
                      : 'border-parchment-300 hover:border-brass-300 hover:bg-parchment-100'}`}
                >
                  <span
                    className={`font-mono text-[11px] font-medium tracking-wider w-8 shrink-0 text-center py-1 rounded
                      ${active ? 'bg-brass-500 text-white' : 'bg-ink-50 text-ink-500 group-hover:bg-brass-100 group-hover:text-brass-700'}`}
                  >
                    {lang.code.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm">{lang.native}</p>
                    <p className="text-[11px] text-ink-400 truncate">{lang.greeting}</p>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${active ? 'text-brass-600' : 'text-ink-300 group-hover:text-brass-500'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative px-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-parchment-300/60 uppercase tracking-eyebrow">
        <span>© {new Date().getFullYear()} · Bakı Limanı</span>
        <span>40°22′N · 49°51′E</span>
      </footer>
    </div>
  );
}
