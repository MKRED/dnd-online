import { CHARACTER_KINDS, type CharacterKind } from 'shared';

// Чипы над списком «Персонажи» — во множественном числе, переключатель в форме — в единственном.
export const CHARACTER_KIND_CHIPS: Record<CharacterKind, string> = {
  pc: 'Игровые',
  npc: 'НПС',
};

export const CHARACTER_KIND_OPTIONS = [
  { value: 'pc', label: 'Игровой' },
  { value: 'npc', label: 'НПС' },
] satisfies { value: CharacterKind; label: string }[];

// Тип из адреса (?kind=npc): список и страница создания. Нет или чужое значение — игровые,
// чтобы старые ссылки на /characters вели туда же, что и раньше.
export function readCharacterKind(params: URLSearchParams): CharacterKind {
  const kind = params.get('kind');
  return CHARACTER_KINDS.find((value) => value === kind) ?? 'pc';
}

// Игровые — без параметра: это вид списка по умолчанию.
export function characterKindQuery(kind: CharacterKind): string {
  return kind === 'pc' ? '' : `?kind=${kind}`;
}
