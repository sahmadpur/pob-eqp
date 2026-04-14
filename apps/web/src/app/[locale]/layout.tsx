import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '../../i18n';
import { StoreHydrator } from '@/components/store-hydrator';
import '../globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Port of Baku E-Queue Platform',
  description: 'Efficient truck shipment queue management for Port of Baku',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StoreHydrator />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
