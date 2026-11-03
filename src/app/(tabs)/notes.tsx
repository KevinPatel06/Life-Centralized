// Notes (spec §3.7, §4): quick capture into the inbox, turn notes into tasks or plans, and notes on tasks & plans.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAppState, useStore } from '../../data/StoreContext';
import { addNote, attachedNotes, deleteNote, inboxNotes, noteToTask, noteWhen, undoNoteToTask } from '../../domain/notes';
import { TAG_COLOR } from '../../ui/theme';
import { toISODate } from '../../lib/dates';
import { Icon, type IconName } from '../../ui/Icon';
import { Field, Screen, shadow } from '../../ui/kit';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';
import { useNow } from '../../ui/useNow';

export default function NotesScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const now = useNow(60_000);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'inbox' | 'attached'>('inbox');
  const [made, setMade] = useState<string | null>(null); // note id just turned into a task
  const inbox = useMemo(() => inboxNotes(s), [s]);
  const attached = useMemo(() => attachedNotes(s, toISODate(now)), [s, now]);

  useEffect(() => {
    if (!made) return;
    const id = setTimeout(() => setMade(null), 6000);
    return () => clearTimeout(id);
  }, [made]);

  function capture() {
    if (!text.trim()) return;
    setMade(null);
    store.update((st) => addNote(st, text, new Date()).state);
    setText('');
  }

  function makeTask(noteId: string) {
    store.update((st) => noteToTask(st, noteId, new Date()).state);
    setMade(noteId);
  }

  function remove(noteId: string) {
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.update((st) => deleteNote(st, noteId)) },
    ]);
  }

  return (
    <Screen>
      <View>
        <Txt kind="display" weight={700} size={40} accessibilityRole="header">
          Notes
        </Txt>
        <Txt size={15} weight={600} style={{ marginTop: 6 }}>
          {inbox.length} in your inbox
        </Txt>
      </View>

      <View style={styles.capture}>
        <Field
          value={text}
          onChangeText={setText}
          placeholder="Jot something down"
          returnKeyType="done"
          onSubmitEditing={capture}
          accessibilityLabel="New note"
          style={[{ flex: 1, backgroundColor: t.card }, shadow(t)]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Save note" onPress={capture} style={[styles.capBtn, { backgroundColor: t.fabBg }]}>
          <Icon name="plus" size={22} color={t.fabInk} strokeWidth={2.6} />
        </Pressable>
      </View>

      <View style={[styles.seg, { backgroundColor: t.card }]}>
        {(['inbox', 'attached'] as const).map((id) => {
          const on = tab === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(id)}
              style={[styles.segBtn, on && { backgroundColor: t.accent }]}
            >
              <Txt size={14} weight={600} color={on ? t.ringInk : t.muted}>
                {id === 'inbox' ? `Inbox · ${inbox.length}` : 'On tasks & plans'}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {tab === 'inbox' ? (
        <View style={{ gap: 10 }}>
          {made ? (
            <View style={[styles.moved, { borderColor: t.doneLine }]}>
              <Icon name="check" size={18} color={t.doneCheck} strokeWidth={3} />
              <Txt size={13.5} color={t.onBgMuted} style={{ flex: 1 }}>
                Now a task in Priorities · Soon
              </Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  store.update((st) => undoNoteToTask(st, made));
                  setMade(null);
                }}
                style={styles.undo}
              >
                <Txt size={14} weight={600}>
                  Undo
                </Txt>
              </Pressable>
            </View>
          ) : null}
          {inbox.length === 0 && !made ? (
            <Txt size={14} color={t.onBgMuted} style={{ textAlign: 'center', paddingVertical: 16 }}>
              Your inbox is clear.
            </Txt>
          ) : null}
          {inbox.map((n) => (
            <Pressable key={n.id} onLongPress={() => remove(n.id)} accessibilityHint="Long press to delete" style={[styles.note, { backgroundColor: t.card }, shadow(t)]}>
              <Txt size={15} weight={500} color={t.ink}>
                {n.text}
              </Txt>
              <Txt size={12.5} color={t.muted}>
                {noteWhen(n.createdAt, now)}
              </Txt>
              <View style={styles.actions}>
                <Action label="Make it a task" icon="list" onPress={() => makeTask(n.id)} />
                <Action
                  label="Make it a plan"
                  icon="cal"
                  onPress={() => {
                    setMade(null);
                    router.push({ pathname: '/plan', params: { title: n.text.split('\n')[0].trim(), fromNoteId: n.id } });
                  }}
                />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {attached.length === 0 ? (
            <Txt size={14} color={t.onBgMuted} style={{ textAlign: 'center', paddingVertical: 16 }}>
              Notes you add to tasks and plans show up here.
            </Txt>
          ) : null}
          {attached.map((a) => {
            const look: { icon: IconName; color: string } =
              a.kind === 'task'
                ? { icon: 'list', color: t.cat[TAG_COLOR[s.tasks[a.id]?.tag ?? 'life']] }
                : a.kind === 'plan'
                  ? { icon: 'cal', color: t.cat.trade }
                  : { icon: 'phone', color: t.cat.work };
            const open =
              a.kind === 'task'
                ? () => router.push({ pathname: '/task/[id]', params: { id: a.id } })
                : a.kind === 'plan'
                  ? () => router.push({ pathname: '/plan', params: { id: a.id } })
                  : () => router.push({ pathname: '/event/[key]', params: { key: a.id } });
            return (
              <Pressable key={a.key} onPress={open} accessibilityRole="button" style={[styles.an, { backgroundColor: t.card }, shadow(t)]}>
                <View style={[styles.pic, { backgroundColor: t.icBg }]}>
                  <Icon name={look.icon} size={18} color={look.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14.5} weight={600} color={t.ink}>
                    {a.title}
                  </Txt>
                  <Txt size={12} color={t.muted}>
                    {a.sub}
                  </Txt>
                  <Txt size={13.5} color={t.ink} style={{ marginTop: 6 }}>
                    {a.text}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: t.fieldBg, opacity: pressed ? 0.75 : 1 }]}>
      <Icon name={icon} size={16} color={t.ink} />
      <Txt size={13.5} weight={600} color={t.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capture: { flexDirection: 'row', gap: 8 },
  capBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  action: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  moved: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, paddingVertical: 6, paddingLeft: 12, paddingRight: 6 },
  undo: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  an: { flexDirection: 'row', gap: 10, borderRadius: 16, paddingTop: 10, paddingRight: 12, paddingBottom: 12, paddingLeft: 10 },
  pic: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
