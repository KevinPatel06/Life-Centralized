// Deleting a plan, shared by the plan sheet and the hold menu on Week.
// It asks first: unlike tasks and notes, a plan can also live in the iPhone calendar, so it gets no Undo.
import { Alert } from 'react-native';

import { removePlanEvent } from '../data/calendarSync';
import type { Store } from '../data/store';
import { deletePlan } from '../domain/plans';

export function confirmDeletePlan(store: Store, planId: string, onDeleted?: () => void): void {
  const plan = store.getState().plans[planId];
  if (!plan) return;
  Alert.alert('Delete this plan?', plan.calendarEventId ? 'It will also be removed from your iPhone calendar.' : undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        const eventId = store.getState().plans[planId]?.calendarEventId;
        store.update((st) => deletePlan(st, planId));
        if (eventId) removePlanEvent(eventId).catch((e) => console.warn('Could not remove the iPhone event', e));
        onDeleted?.();
      },
    },
  ]);
}
