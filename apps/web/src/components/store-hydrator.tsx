'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Rehydrates Zustand persisted stores after the first client-side render.
 *
 * Why this exists:
 * Zustand's `persist` middleware reads from localStorage, which doesn't
 * exist on the server. Without skipHydration + this component, the server
 * renders `user: null` while the client renders `user: { email: ... }`,
 * causing a Next.js hydration mismatch error.
 *
 * With skipHydration: true in the store, both server and client start from
 * null. This component calls rehydrate() after mount so the client picks
 * up the stored session without causing a hydration error.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  return null;
}
