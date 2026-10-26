import type { MapObjectKind, MapObjectSummary } from 'shared';

export type ObjectGroupKey =
  'npcs' | 'creatures' | 'starts' | 'containers' | 'furniture' | 'items';

export interface ObjectGroup {
  key: ObjectGroupKey;
  title: string;
  rows: MapObjectSummary[];
}

// Порядок групп «На карте» (вариант А артборда «Н3», 2026-10-24, docs/plan/done/scene-page.md,
// этап 8): чаще всего ищут существ, реже всего — предметы на полу. НПС — своей группой
// перед существами, как в «Участниках» (пользователь, 2026-10-24).
const GROUPS: { key: ObjectGroupKey; title: string }[] = [
  { key: 'npcs', title: 'НПС' },
  { key: 'creatures', title: 'Существа' },
  { key: 'starts', title: 'Старты' },
  { key: 'containers', title: 'Контейнеры' },
  { key: 'furniture', title: 'Обстановка' },
  { key: 'items', title: 'Предметы' },
];

const GROUP_OF: Record<MapObjectKind, ObjectGroupKey> = {
  monster: 'creatures',
  npc: 'npcs',
  start: 'starts',
  container: 'containers',
  furniture: 'furniture',
  item: 'items',
};

// Подходит ли объект под поиск: часть имени без учёта регистра или номер («7», «№7»).
function matches(summary: MapObjectSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const number = q.replace(/^№\s*/, '');
  if (/^\d+$/.test(number)) return String(summary.id) === number;
  return summary.label.toLowerCase().includes(q);
}

// Объекты по группам видов, внутри — по номерам; пустые группы не показываются.
export function objectGroups(
  summaries: readonly MapObjectSummary[],
  query = '',
): ObjectGroup[] {
  const found = summaries
    .filter((summary) => matches(summary, query))
    .sort((a, b) => a.id - b.id);
  return GROUPS.map(({ key, title }) => ({
    key,
    title,
    rows: found.filter((summary) => GROUP_OF[summary.kind] === key),
  })).filter((group) => group.rows.length > 0);
}
