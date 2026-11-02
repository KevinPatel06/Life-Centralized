import { router } from 'expo-router';

import { BackLink, Screen } from '../ui/kit';
import { Txt } from '../ui/Txt';

export default function Settings() {
  return (
    <Screen tabBar={false}>
      <BackLink label="Today" onPress={() => router.back()} />
      <Txt kind="display" weight={700} size={36}>
        Settings
      </Txt>
    </Screen>
  );
}
