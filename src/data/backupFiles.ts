// Moving backups in and out through Files. The same calls passed the on-device spike.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { toISODate } from '../lib/dates';
import type { AppState } from '../domain/types';
import { type ParseResult, makeBackup, parseBackup } from './backup';

/** Write the backup file and open the share sheet so it can be saved to Files. */
export async function shareBackup(s: AppState): Promise<void> {
  const now = new Date();
  const file = new File(Paths.document, `life-centralized-backup-${toISODate(now)}.json`);
  if (!file.exists) file.create();
  await file.write(JSON.stringify(makeBackup(s, now)));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Let the owner pick a backup file. Null when they cancel. */
export async function pickBackup(): Promise<ParseResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (picked.canceled) return null;
  return parseBackup(await new File(picked.assets[0].uri).text());
}
