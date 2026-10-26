import type { Participant, ParticipantGroupKey } from './ParticipantRow';

// Строка группы: участник или несколько одинаковых существ, свёрнутых в одну строку
// (замечания после первой партии, 2026-10-26: девять одинаковых крыс — одной строкой «×9»).
export type GroupEntry =
  | { kind: 'row'; participant: Participant }
  | { kind: 'kin'; key: string; participants: Participant[] };

export interface ParticipantGroup {
  key: ParticipantGroupKey;
  title: string;
  entries: GroupEntry[];
  count: number;
  // Сколько ранено и сколько повержено — в заголовке свёрнутой группы.
  hurt: number;
  down: number;
}

// Порядок групп: НПС между героями и существами (пользователь, 2026-10-24), уникальные
// монстры — перед обычными.
const GROUPS: { key: ParticipantGroupKey; title: string }[] = [
  { key: 'pc', title: 'Герои' },
  { key: 'npc', title: 'НПС' },
  { key: 'unique', title: 'Уникальные существа' },
  { key: 'monster', title: 'Существа' },
];

export const isDown = (p: Participant) =>
  p.health === 'down' || p.health === 'dead';

// Свёрнутые одинаковые встают на место первого из них; одиночка остаётся строкой.
function entriesOf(rows: readonly Participant[]): GroupEntry[] {
  const kin = new Map<string, Participant[]>();
  for (const row of rows) {
    if (row.kin) kin.set(row.kin, [...(kin.get(row.kin) ?? []), row]);
  }
  const placed = new Set<string>();
  return rows.flatMap((participant): GroupEntry[] => {
    const same = participant.kin ? kin.get(participant.kin) : undefined;
    if (!participant.kin || !same || same.length < 2) {
      return [{ kind: 'row', participant }];
    }
    if (placed.has(participant.kin)) return [];
    placed.add(participant.kin);
    return [{ kind: 'kin', key: participant.kin, participants: same }];
  });
}

// Группы вкладки «Участники»; пустые не показываются.
export function participantGroups(
  participants: readonly Participant[],
): ParticipantGroup[] {
  return GROUPS.flatMap(({ key, title }) => {
    const rows = participants.filter((p) => p.group === key);
    if (rows.length === 0) return [];
    return [
      {
        key,
        title,
        entries: entriesOf(rows),
        count: rows.length,
        hurt: rows.filter((p) => p.health === 'bloodied').length,
        down: rows.filter(isDown).length,
      },
    ];
  });
}

// Ключ строки для выбора — как у вкладки: «pc:<id>» или «creature:<номер объекта>».
export const selectionKey = (p: Participant) =>
  `${p.kind === 'pc' ? 'pc' : 'creature'}:${p.key}`;

// Что раскрыть, чтобы выбранный был виден в списке: его группу и его свёрнутых одинаковых.
export function revealKeys(
  groups: readonly ParticipantGroup[],
  selectedKey: string,
): string[] {
  for (const group of groups) {
    for (const entry of group.entries) {
      if (
        entry.kind === 'row' &&
        selectionKey(entry.participant) === selectedKey
      )
        return [group.key];
      if (
        entry.kind === 'kin' &&
        entry.participants.some((p) => selectionKey(p) === selectedKey)
      )
        return [group.key, entry.key];
    }
  }
  return [];
}
