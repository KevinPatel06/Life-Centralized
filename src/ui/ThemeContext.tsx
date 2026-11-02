import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppState } from '../data/StoreContext';
import { type Theme, resolveTheme } from './theme';

export function useTheme(): Theme {
  const settings = useAppState().settings;
  const scheme = useColorScheme();
  return useMemo(() => resolveTheme(settings, scheme), [settings, scheme]);
}
