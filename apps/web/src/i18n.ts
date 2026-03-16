import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { SupportedLocale } from '@pob-eqp/shared';

export const locales = Object.values(SupportedLocale) as string[];
export const defaultLocale = SupportedLocale.AZ;

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as string)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
