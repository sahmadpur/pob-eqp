'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LOCALES = [
  { code: 'az', label: 'AZ', name: 'Azərbaycan' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'tr', label: 'TR', name: 'Türkçe' },
];

const KNOWN_LOCALE_CODES = LOCALES.map((l) => l.code);
const DEFAULT_LOCALE = 'az';

interface LocaleSwitcherProps {
  /** 'dark' for dark navbars (white text), 'light' for light headers (gray text) */
  variant?: 'dark' | 'light';
}

export function LocaleSwitcher({ variant = 'dark' }: LocaleSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function switchLocale(newLocale: string) {
    if (newLocale === locale) {
      setOpen(false);
      return;
    }

    // Strip any existing locale prefix from the path
    const segments = pathname.split('/').filter(Boolean);
    let pathWithoutLocale: string;
    if (segments.length > 0 && KNOWN_LOCALE_CODES.includes(segments[0])) {
      pathWithoutLocale = '/' + segments.slice(1).join('/');
    } else {
      // Current path has no prefix (we're on the default locale)
      pathWithoutLocale = pathname || '/';
    }

    // With next-intl `as-needed`, default locale (AZ) has NO URL prefix
    const newPath =
      newLocale === DEFAULT_LOCALE
        ? pathWithoutLocale || '/'
        : `/${newLocale}${pathWithoutLocale}`;

    setOpen(false);
    // Use hard navigation so next-intl middleware picks up the locale change
    window.location.href = newPath;
  }

  const isDark = variant === 'dark';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch language"
        className={`flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <svg
          className="w-3.5 h-3.5 opacity-70 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253"
          />
        </svg>
        <span className="font-semibold tracking-wide">{current.label}</span>
        <svg
          className="w-3 h-3 opacity-60 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden py-1">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  l.code === locale
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`font-bold text-xs w-6 shrink-0 ${
                    l.code === locale ? 'text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {l.label}
                </span>
                <span className={l.code === locale ? 'font-semibold' : ''}>{l.name}</span>
                {l.code === locale && (
                  <svg
                    className="w-3.5 h-3.5 text-blue-600 ml-auto shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
