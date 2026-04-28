'use client';

import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Crest } from '@/components/brand/crest';
import { WavePattern } from '@/components/brand/wave-pattern';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('authHero');
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-parchment">
      {/* ── Left: maritime hero ───────────────────────────────────────────── */}
      <aside className="relative lg:flex-[1.1] bg-ink-800 text-parchment-50 overflow-hidden flex flex-col justify-between px-6 py-8 lg:px-14 lg:py-12 min-h-[260px]">
        {/* Wave / radar / grid backdrop */}
        <WavePattern className="absolute inset-0 w-full h-full text-parchment-50 opacity-90" />

        {/* Soft ink wash on top so text stays legible */}
        <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-800/85 to-ink-900/95" />

        {/* Top crest + wordmark */}
        <header className="relative flex items-center gap-3.5 animate-fade-in">
          <span className="text-brass-300">
            <Crest className="w-12 h-12" />
          </span>
          <div>
            <p className="font-display text-xl leading-none tracking-tight text-parchment-50">
              {t('portOfBaku')}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-eyebrow text-brass-300 font-medium">
              {t('eQueuePlatform')}
            </p>
          </div>
        </header>

        {/* Editorial centerpiece — only on lg+ */}
        <div className="relative hidden lg:block max-w-md animate-fade-up">
          <p className="eyebrow-brass text-brass-300/90">
            {t('eyebrow')}
          </p>
          <h2 className="mt-5 font-display text-[2.6rem] leading-[1.05] tracking-tight text-parchment-50">
            {t.rich('headline', {
              em: (chunks) => (
                <em className="font-display italic text-brass-200">{chunks}</em>
              ),
            })}
          </h2>
          <p className="mt-6 text-parchment-200/80 text-[15px] leading-relaxed max-w-sm">
            {t('description')}
          </p>

          <div className="admiralty-rule mt-10 max-w-xs" />
          <div className="mt-5 grid grid-cols-3 gap-6 max-w-xs">
            <Stat n="1.2K" label={t('dailySlots')} />
            <Stat n="24/7" label={t('dispatch')} />
            <Stat n="4" label={t('languages')} />
          </div>
        </div>

        {/* Footer credits */}
        <footer className="relative flex items-center justify-between text-[11px] text-parchment-300/70">
          <span className="uppercase tracking-eyebrow">© {year} · {t('bakiLimani')}</span>
          <span className="hidden sm:inline uppercase tracking-eyebrow">
            40°22′N · 49°51′E
          </span>
        </footer>
      </aside>

      {/* Locale switcher — fixed to viewport so it's always at top-right
          regardless of mobile (stacked) vs desktop (split) layout.
          Uses 'light' variant because on lg+ it sits over the white form panel. */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher variant="light" />
      </div>

      {/* ── Right: form surface ───────────────────────────────────────────── */}
      <main className="relative flex-1 flex items-start lg:items-center justify-center px-4 sm:px-8 py-10 lg:py-14">
        <div className="w-full max-w-md animate-fade-up">
          {/* Inner surface — parchment paper feel */}
          <div className="relative bg-white border border-parchment-300 rounded-2xl shadow-admiralty-lg px-7 py-9 sm:px-10 sm:py-11">
            {/* Brass corner detail */}
            <span aria-hidden className="absolute -top-px left-8 right-8 admiralty-rule" />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-brass-200 tabular-nums">{n}</p>
      <p className="mt-1 text-[10px] uppercase tracking-eyebrow text-parchment-300/70">{label}</p>
    </div>
  );
}
