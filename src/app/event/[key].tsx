// An imported iPhone event: read-only, but it can carry a note (spec §3.6).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, useStore } from '../../data/StoreContext';
import { eventWhen } from '../../domain/calendar';
import { setEventNote } from '../../domain/notes';
import { Field, Label, PrimaryButton } from '../../ui/kit';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';

export default function EventSheet() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { key } = useLocalSearchParams<{ key: string }>();
  const event = s.calendar.events.find((e) => e.key === key);
  const saved = key ? s.eventNotes[key] : undefined;
  const [text, setText] = useState(saved?.text ?? '');

  if (!event) {
    return (
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Txt kind="display" weight={600} size={22} color={t.ink}>
          {saved?.title ?? 'iPhone event'}
        </Txt>
        <Txt size={14} color={t.muted}>
          This event is no longer in the next 8 weeks of your calendar.
        </Txt>
        {saved ? (
          <Txt size={15} color={t.ink}>
            {saved.text}
          </Txt>
        ) : null}
      </View>
    );
  }
  const calendar = s.calendar.calendars.find((c) => c.id === event.calendarId);

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
      <Txt kind="display" weight={600} size={22} color={t.ink} accessibilityRole="header">
        {event.title}
      </Txt>
      <Txt size={14} color={t.muted}>
        {eventWhen(event)}
        {calendar ? ` · ${calendar.title}` : ''}
      </Txt>
      <Txt size={13} color={t.muted}>
        Read-only. Edit it in the Calendar app.
      </Txt>
      <View style={{ gap: 8 }}>
        <Label>Note</Label>
        <Field value={text} onChangeText={setText} multiline placeholder="Add a note for yourself" accessibilityLabel="Note" />
      </View>
      <PrimaryButton
        label="Save note"
        onPress={() => {
          store.update((st) => setEventNote(st, event, text, new Date()));
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 18, paddingTop: 22, gap: 12 },
});
