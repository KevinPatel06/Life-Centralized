// Throwaway: on-device spike for spec §9. Deleted in the next plan.
// Shows and copies counts only — never calendar or event titles.
import * as Application from 'expo-application';
import {
  createCalendar,
  getCalendars,
  getDefaultCalendarSync,
  listEvents,
  requestCalendarPermissions,
} from 'expo-calendar';
import { EntityTypes } from 'expo-calendar/legacy';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { openDatabaseAsync } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { planningWindow } from '../lib/dates';
import {
  CHECK_LABELS,
  CHECK_ORDER,
  type CheckId,
  type CheckResult,
  calendarReadVerdict,
  exportVerdict,
  formatSpikeReport,
  persistenceVerdict,
  pickCentralizedCalendar,
  summarizeCalendars,
} from './report';

const BUILD = Application.nativeBuildVersion ?? 'dev';
const IOS_VERSION = String(Platform.Version);
const EXPORT_NAME = 'centralized-spike.json';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function SpikeScreen() {
  const [results, setResults] = useState<Partial<Record<CheckId, CheckResult>>>({});
  const [copied, setCopied] = useState(false);
  const set = (r: CheckResult) => setResults((prev) => ({ ...prev, [r.id]: r }));

  useEffect(() => {
    (async () => {
      try {
        const db = await openDatabaseAsync('spike.db');
        await db.execAsync(
          'CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, build TEXT NOT NULL, at TEXT NOT NULL)',
        );
        await db.runAsync('INSERT INTO runs (build, at) VALUES (?, ?)', BUILD, new Date().toISOString());
        const rows = await db.getAllAsync<{ build: string; at: string }>('SELECT build, at FROM runs ORDER BY id');
        set({ id: 'launch', status: 'pass', detail: `${rows.length} launches saved` });
        set(persistenceVerdict(rows, BUILD));
      } catch (e) {
        set({ id: 'launch', status: 'pass', detail: 'opened' });
        set({ id: 'persistence', status: 'fail', detail: message(e) });
      }
    })();
  }, []);

  async function readCalendars() {
    try {
      const perm = await requestCalendarPermissions();
      if (!perm.granted) return set(calendarReadVerdict(perm.status, null));
      const calendars = await getCalendars(EntityTypes.EVENT);
      const { start, end } = planningWindow(new Date());
      const events = calendars.length ? await listEvents(calendars, start, end) : [];
      set(calendarReadVerdict('granted', summarizeCalendars(calendars, events)));
    } catch (e) {
      set({ id: 'calendarRead', status: 'fail', detail: message(e) });
    }
  }

  async function writeCalendar() {
    try {
      const perm = await requestCalendarPermissions();
      if (!perm.granted) return set({ id: 'calendarWrite', status: 'fail', detail: `permission ${perm.status}` });
      const calendars = await getCalendars(EntityTypes.EVENT);
      const existingId = pickCentralizedCalendar(calendars);
      const target =
        calendars.find((c) => c.id === existingId) ??
        (await (async () => {
          const source = getDefaultCalendarSync().source;
          return createCalendar({
            title: 'Centralized',
            color: '#47705A',
            entityType: EntityTypes.EVENT,
            sourceId: source.id,
            source,
            name: 'Centralized',
          });
        })());
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 1, 0, 0, 0);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      await target.createEvent({ title: 'Centralized spike test', startDate, endDate });
      const at = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      set({ id: 'calendarWrite', status: 'pass', detail: `Check the iPhone Calendar app at ${at}` });
    } catch (e) {
      set({ id: 'calendarWrite', status: 'fail', detail: message(e) });
    }
  }

  async function exportFile() {
    try {
      const file = new File(Paths.document, EXPORT_NAME);
      if (!file.exists) file.create();
      await file.write(
        JSON.stringify({ app: 'life-centralized', kind: 'spike', build: BUILD, writtenAt: new Date().toISOString() }),
      );
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
      set({ id: 'export', status: 'pending', detail: 'Saved? Now tap "Read file back"' });
    } catch (e) {
      set(exportVerdict({ kind: 'error', message: message(e) }));
    }
  }

  async function readBack() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (picked.canceled) return set(exportVerdict({ kind: 'cancelled' }));
      const text = await new File(picked.assets[0].uri).text();
      set(exportVerdict({ kind: 'read', json: JSON.parse(text) }));
    } catch (e) {
      set(exportVerdict({ kind: 'error', message: message(e) }));
    }
  }

  async function copyReport() {
    const list = CHECK_ORDER.map((id) => results[id]).filter((r): r is CheckResult => !!r);
    await Clipboard.setStringAsync(formatSpikeReport(list, { build: BUILD, iosVersion: IOS_VERSION }));
    setCopied(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Phone check</Text>
      <Text style={styles.meta}>
        Build {BUILD} · iOS {IOS_VERSION}
      </Text>

      {CHECK_ORDER.map((id, i) => {
        const r = results[id];
        return (
          <View key={id} style={styles.row}>
            <Text style={styles.label}>
              {i + 1}. {CHECK_LABELS[id]}: <Text style={styles.status}>{(r?.status ?? 'pending').toUpperCase()}</Text>
            </Text>
            {r?.detail ? <Text style={styles.detail}>{r.detail}</Text> : null}
          </View>
        );
      })}

      <Button label="Read calendars" onPress={readCalendars} />
      <Button label="Create Centralized calendar + test event" onPress={writeCalendar} />
      <Button label="Export test file" onPress={exportFile} />
      <Button label="Read file back" onPress={readBack} />
      <Button label={copied ? 'Copied! Paste it in the chat' : 'Copy report'} onPress={copyReport} primary />
    </ScrollView>
  );
}

function Button({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, primary && styles.btnPrimary, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingTop: 72, gap: 12, backgroundColor: '#F8F4ED', minHeight: '100%' },
  h1: { fontSize: 32, fontWeight: '700', color: '#2A241D' },
  meta: { fontSize: 14, color: '#6A6052', marginBottom: 8 },
  row: { backgroundColor: '#DCE6D5', borderRadius: 16, padding: 14, gap: 4 },
  label: { fontSize: 15, fontWeight: '600', color: '#1F2A20' },
  status: { fontWeight: '800' },
  detail: { fontSize: 13, color: '#4D5C4D' },
  btn: { minHeight: 52, borderRadius: 16, backgroundColor: '#DCE6D5', justifyContent: 'center', paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: '#2B2219' },
  btnText: { fontSize: 15, fontWeight: '600', color: '#1F2A20', textAlign: 'center' },
  btnTextPrimary: { color: '#F7F0E3' },
});
