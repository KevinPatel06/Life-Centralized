// Quick add (spec §3.8): one field, saved as a Note (default), a Task (Soon) or a Plan.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../data/StoreContext';
import { quickAdd } from '../domain/notes';
import { Field, PrimaryButton } from '../ui/kit';
import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

export default function QuickAdd() {
  const t = useTheme();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const blank = !text.trim();

  function save(as: 'note' | 'task') {
    if (blank) return;
    store.update((st) => quickAdd(st, text, as, new Date()).state);
    router.back();
  }

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
      <Txt kind="display" weight={600} size={24} color={t.ink} accessibilityRole="header">
        Quick add
      </Txt>
      <Field
        value={text}
        onChangeText={setText}
        placeholder="What's on your mind?"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => save('note')}
        accessibilityLabel="Quick add text"
      />
      <PrimaryButton label="Save as note" onPress={() => save('note')} disabled={blank} />
      <View style={styles.row}>
        <Secondary label="Task" disabled={blank} onPress={() => save('task')} />
        <Secondary
          label="Plan"
          disabled={blank}
          onPress={() => router.replace({ pathname: '/plan', params: { title: text.trim() } })}
        />
      </View>
    </View>
  );
}

function Secondary({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, { backgroundColor: t.fieldBg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}
    >
      <Txt size={15} weight={600} color={t.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 18, paddingTop: 22, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  secondary: { flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
