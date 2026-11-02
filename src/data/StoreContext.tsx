import { type ReactNode, createContext, useContext, useSyncExternalStore } from 'react';

import type { AppState } from '../domain/types';
import type { Store } from './store';

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore needs a StoreProvider');
  return store;
}

/** The whole state; re-renders on every change. Derive views with useMemo. */
export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}
