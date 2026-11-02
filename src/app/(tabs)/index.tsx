import { Buddy } from '../../ui/Buddy';
import { Screen } from '../../ui/kit';
import { Txt } from '../../ui/Txt';

export default function TodayScreen() {
  return (
    <Screen>
      <Txt kind="display" weight={700} size={44}>
        Today
      </Txt>
      <Buddy />
    </Screen>
  );
}
