import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorMode = 'dark' | 'light';

type ThemeState = {
  mode: ColorMode;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggle: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'deepsfv-theme' },
  ),
);

export function useThemeAttribute(): void {
  const mode = useThemeStore((s) => s.mode);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);
}
