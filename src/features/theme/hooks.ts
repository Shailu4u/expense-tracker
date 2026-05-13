import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useThemeStore, type ThemeMode } from './themeStore';
import * as SettingsRepo from '@/features/settings/repository';

export function useInitTheme() {
  const qc = useQueryClient();
  const setMode = useThemeStore((s) => s.setMode);

  useEffect(() => {
    void SettingsRepo.get().then((settings) => {
      setMode((settings.theme as ThemeMode) || 'light');
    });
  }, [setMode]);
}

export async function updateTheme(mode: ThemeMode, queryClient: QueryClient): Promise<void> {
  await SettingsRepo.update({ theme: mode });
  await queryClient.invalidateQueries({ queryKey: ['settings'] });
}
