import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Buddy } from '../../ui/Buddy';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/kit';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';

export default function TodayScreen() {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Txt kind="display" weight={700} size={44} style={{ flex: 1 }}>
          Today
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="gear" size={24} color={t.onBgMuted} />
        </Pressable>
      </View>
      <Buddy />
    </Screen>
  );
}
