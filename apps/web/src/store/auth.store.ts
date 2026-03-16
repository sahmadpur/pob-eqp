import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserSummary } from '@pob-eqp/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSummary | null;
  isAuthenticated: boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; user: UserSummary }) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<UserSummary>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),

      updateUser: (partialUser) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partialUser } });
      },
    }),
    {
      name: 'pob-auth',
      storage: createJSONStorage(() => localStorage),
      // Prevents server/client mismatch in Next.js App Router.
      // StoreHydrator in root layout calls rehydrate() after mount.
      skipHydration: true,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
