import { View } from 'react-native';

import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

export default function QuickAdd() {
  const t = useTheme();
  return (
    <View style={{ padding: 18, paddingBottom: 32, gap: 12 }}>
      <Txt kind="display" weight={600} size={24} color={t.ink}>
        Quick add
      </Txt>
    </View>
  );
}
