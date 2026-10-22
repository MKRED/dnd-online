import { HAZARDS, hazardLabel, MATERIALS, type BlockGroupFields } from 'shared';

// Виды группы для чипов и бейджей — её заметные свойства. Группа без них — «Обычный».
// У одной группы их бывает несколько: горящий труднопроходимый блок в обоих чипах.
export const BLOCK_KINDS = [
  'plain',
  'hazard',
  'difficult',
  'seeThrough',
  'flammable',
  'climbable',
] as const;

export const BLOCK_KIND_LABELS: Record<string, string> = {
  plain: 'Обычный',
  hazard: 'Опасный',
  difficult: 'Труднопроходимый',
  seeThrough: 'Прозрачный',
  flammable: 'Горит',
  climbable: 'Можно лазать',
};

export function blockKinds(group: BlockGroupFields): string[] {
  const kinds = [
    group.hazard && 'hazard',
    group.movementCost === 2 && 'difficult',
    !group.opaque && 'seeThrough',
    group.flammable && 'flammable',
    group.climbable && 'climbable',
  ].filter((kind): kind is string => Boolean(kind));
  return kinds.length ? kinds : ['plain'];
}

// Строки карточки, кроме основы и цвета (их рисует blockRows с образцами).
export function blockTraitRows(
  group: BlockGroupFields,
): { label: string; value: string }[] {
  const { durability, hazard } = group;
  return [
    { label: 'Обзор', value: group.opaque ? 'Закрывает' : 'Не закрывает' },
    {
      label: 'Движение',
      value: [
        group.movementCost === 2
          ? 'Труднопроходимая местность: шаг стоит 10 футов'
          : 'Обычное',
        group.climbable && 'можно лазать',
      ]
        .filter(Boolean)
        .join(', '),
    },
    ...(hazard
      ? [
          {
            label: 'Опасность',
            value: `${MATERIALS[hazard].label}: ${hazardLabel(HAZARDS[hazard])}`,
          },
        ]
      : []),
    {
      label: 'Прочность',
      value: durability
        ? `КД ${durability.armorClass}, ХП ${durability.hitPoints}`
        : 'Не разрушается',
    },
    ...(group.flammable ? [{ label: 'Горит', value: 'Да' }] : []),
  ];
}
