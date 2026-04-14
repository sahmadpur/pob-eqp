import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { SupportedLocale } from '@pob-eqp/shared';

export const locales = Object.values(SupportedLocale) as string[];
export const defaultLocale = SupportedLocale.AZ;

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is the locale extracted from the URL by next-intl middleware
  const locale = await requestLocale;

  if (!locale || !locales.includes(locale)) notFound();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
