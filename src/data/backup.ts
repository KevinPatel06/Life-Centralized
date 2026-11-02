// One JSON file of everything, versioned (spec §6). The seed file uses the same format.
import { emptyState } from '../domain/template';
import type { AppState } from '../domain/types';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'life-centralized';
  kind: 'backup';
  version: number;
  exportedAt: string;
  data: AppState;
}

export type ParseResult = { ok: true; state: AppState } | { ok: false; error: string };

export function makeBackup(s: AppState, now: Date): BackupFile {
  return { app: 'life-centralized', kind: 'backup', version: BACKUP_VERSION, exportedAt: now.toISOString(), data: s };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseBackup(text: string): ParseResult {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a backup." };
  }
  if (!isObject(file)) return { ok: false, error: "That file isn't a backup." };
  if (file.app !== 'life-centralized' || file.kind !== 'backup' || !isObject(file.data)) {
    return { ok: false, error: "That file isn't a Life Centralized backup." };
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    return { ok: false, error: 'That backup is from a newer version of the app.' };
  }
  // Older backups may lack parts added later: fill each from the defaults.
  const defaults = emptyState();
  const data = file.data as Partial<AppState>;
  const state: AppState = {
    ...defaults,
    ...data,
    settings: { ...defaults.settings, ...(isObject(data.settings) ? data.settings : {}) },
  };
  if (!isObject(state.template) || !Array.isArray(state.template.days) || state.template.days.length !== 7) {
    return { ok: false, error: "That backup's routine is damaged." };
  }
  return { ok: true, state };
}
