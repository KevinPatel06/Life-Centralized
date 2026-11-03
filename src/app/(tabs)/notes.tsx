// Notes (spec §3.7, §4): quick capture into the inbox, turn notes into tasks or plans, and notes on tasks & plans.
// Hold an inbox note for its menu: make it a task or a plan, copy it, or delete it.
import * as Clipboard from 'expo-clipboard';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import { useAppState, useStore } from '../../data/StoreContext';
import { addNote, attachedNotes, deleteNote, inboxNotes, noteToTask, noteWhen, restoreNote, undoNoteToTask } from '../../domain/notes';
import type { Note } from '../../domain/types';
import { toISODate } from '../../lib/dates';
import { haptic } from '../../ui/haptics';
import { Icon, type IconName } from '../../ui/Icon';
import { Field, Screen, shadow } from '../../ui/kit';
import { Press } from '../../ui/Press';
import { TAG_COLOR } from '../../ui/theme';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';
import { useUndo } from '../../ui/Undo';
import { useNow } from '../../ui/useNow';

const move = LinearTransition.duration(220);

export default function NotesScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const offerUndo = useUndo();
  const now = useNow(60_000);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'inbox' | 'attached'>('inbox');
  const inbox = useMemo(() => inboxNotes(s), [s]);
  const attached = useMemo(() => attachedNotes(s, toISODate(now)), [s, now]);

  function capture() {
    if (!text.trim()) return;
    haptic.tap();
    store.update((st) => addNote(st, text, new Date()).state);
    setText('');
  }

  function makeTask(noteId: string) {
    haptic.tap();
    store.update((st) => noteToTask(st, noteId, new Date()).state);
    offerUndo('Now a task in Priorities · Soon', () => store.update((st) => undoNoteToTask(st, noteId)));
  }

  function makePlan(note: Note) {
    router.push({ pathname: '/plan', params: { title: note.text.split('\n')[0].trim(), fromNoteId: note.id } });
  }

  function remove(note: Note) {
    store.update((st) => deleteNote(st, note.id));
    offerUndo('Note deleted', () => store.update((st) => restoreNote(st, note)));
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
        <Press accessibilityRole="button" accessibilityLabel="Save note" onPress={capture} dip={0.9} style={[styles.capBtn, { backgroundColor: t.fabBg }]}>
          <Icon name="plus" size={22} color={t.fabInk} strokeWidth={2.6} />
        </Press>
      </View>

      <View style={[styles.seg, { backgroundColor: t.card }]}>
        {(['inbox', 'attached'] as const).map((id) => {
          const on = tab === id;
          return (
            <Press
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (on) return;
                haptic.select();
                setTab(id);
              }}
              dip={0.97}
              style={[styles.segBtn, on && { backgroundColor: t.accent }]}
            >
              <Txt size={14} weight={600} color={on ? t.ringInk : t.muted}>
                {id === 'inbox' ? `Inbox · ${inbox.length}` : 'On tasks & plans'}
              </Txt>
            </Press>
          );
        })}
      </View>

      {/* Notes fade in when added later, not when the tab first opens. */}
      <LayoutAnimationConfig skipEntering>
        {tab === 'inbox' ? (
          <View style={{ gap: 10 }}>
            {inbox.length === 0 ? (
              <Animated.View entering={FadeIn} layout={move}>
                <Txt size={14} color={t.onBgMuted} style={{ textAlign: 'center', paddingVertical: 16 }}>
                  Your inbox is clear.
                </Txt>
              </Animated.View>
            ) : null}
            {inbox.map((n) => (
              <Animated.View key={n.id} entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={move}>
                {/*
                  The Link is only here for the iPhone hold menu; a note has no page of its own, so a plain tap is
                  stopped before it navigates. If that ever slipped through it would land on Notes, where we already are.
                */}
                <Link href="/notes" asChild onPress={(e) => e.preventDefault()}>
                  <Link.Trigger>
                    <Press accessibilityHint="Hold for more" dip={0.985} style={[styles.note, { backgroundColor: t.card }, shadow(t)]}>
                      <Txt size={15} weight={500} color={t.ink}>
                        {n.text}
                      </Txt>
                      <Txt size={12.5} color={t.muted}>
                        {noteWhen(n.createdAt, now)}
                      </Txt>
                      <View style={styles.actions}>
                        <Action label="Make it a task" icon="list" onPress={() => makeTask(n.id)} />
                        <Action label="Make it a plan" icon="cal" onPress={() => makePlan(n)} />
                      </View>
                    </Press>
                  </Link.Trigger>
                  <Link.Menu>
                    <Link.MenuAction title="Make it a task" icon="checklist" onPress={() => makeTask(n.id)} />
                    <Link.MenuAction title="Make it a plan" icon="calendar.badge.plus" onPress={() => makePlan(n)} />
                    <Link.MenuAction title="Copy" icon="doc.on.doc" onPress={() => Clipboard.setStringAsync(n.text).catch(() => {})} />
                    <Link.MenuAction title="Delete" icon="trash" destructive onPress={() => remove(n)} />
                  </Link.Menu>
                </Link>
              </Animated.View>
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
                <Press key={a.key} onPress={open} accessibilityRole="button" dip={0.98} style={[styles.an, { backgroundColor: t.card }, shadow(t)]}>
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
                </Press>
              );
            })}
          </View>
        )}
      </LayoutAnimationConfig>
    </Screen>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press accessibilityRole="button" onPress={onPress} dip={0.95} style={[styles.action, { backgroundColor: t.fieldBg }]}>
      <Icon name={icon} size={16} color={t.ink} />
      <Txt size={13.5} weight={600} color={t.ink}>
        {label}
      </Txt>
    </Press>
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
  an: { flexDirection: 'row', gap: 10, borderRadius: 16, paddingTop: 10, paddingRight: 12, paddingBottom: 12, paddingLeft: 10 },
  pic: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
