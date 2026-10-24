import type { GameEvent } from 'shared';

// Новые записи для числа на вкладке «Журнал»: пришедшие после последней увиденной и
// сделанные не самим мастером — своё он и так знает, иначе число росло бы от каждого
// его щелчка.
export function unreadCount(
  live: readonly GameEvent[],
  seen: number,
  userId: string | null,
): number {
  return live.filter((event) => event.seq > seen && event.actor?.id !== userId)
    .length;
}
