import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';

interface LockState {
  // Whether the lock UI must be shown to the user. False once unlocked.
  isLocked: boolean;
  // Whether a lock is configured at all (mirrors app_settings.lock_kind != 'none').
  lockConfigured: boolean;
  // Grace period after backgrounding before re-locking.
  graceSeconds: number;
  _backgroundedAt: number | null;
  setConfigured: (configured: boolean, graceSeconds: number) => void;
  lock: () => void;
  unlock: () => void;
  // Wire to AppState; returns subscription remover.
  bindAppState: () => () => void;
}

export const useLockStore = create<LockState>((set, get) => ({
  isLocked: false,
  lockConfigured: false,
  graceSeconds: 60,
  _backgroundedAt: null,

  setConfigured(configured, graceSeconds) {
    set({ lockConfigured: configured, graceSeconds });
    if (configured && get().isLocked === false && get()._backgroundedAt === null) {
      // First-time configuration shouldn't auto-lock; explicit lock() call required.
    }
  },

  lock() {
    set({ isLocked: true });
  },

  unlock() {
    set({ isLocked: false, _backgroundedAt: null });
  },

  bindAppState() {
    const handler = (state: AppStateStatus) => {
      const cfg = get();
      if (!cfg.lockConfigured) return;
      if (state === 'background' || state === 'inactive') {
        set({ _backgroundedAt: Date.now() });
      } else if (state === 'active') {
        const ts = get()._backgroundedAt;
        if (ts !== null) {
          const elapsed = (Date.now() - ts) / 1000;
          if (elapsed >= cfg.graceSeconds) {
            set({ isLocked: true });
          }
          set({ _backgroundedAt: null });
        }
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  },
}));
