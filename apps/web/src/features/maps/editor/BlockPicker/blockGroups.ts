import {
  BLOCK_CATALOG,
  MATERIALS,
  type BlockDefinition,
  type MaterialName,
} from 'shared';

export interface MaterialGroup {
  label: string;
  materials: MaterialName[];
}

// Группы материалов в окне выбора блока. Материал, которого здесь нет (добавили в
// shared и забыли сюда), попадает в «Прочие» — не теряется.
const GROUPS: readonly { label: string; materials: readonly MaterialName[] }[] =
  [
    {
      label: 'Постройки',
      materials: [
        'stone',
        'cobble',
        'darkstone',
        'mossy',
        'brick',
        'wood',
        'darkwood',
        'glass',
      ],
    },
    {
      label: 'Природа',
      materials: [
        'dirt',
        'grass',
        'path',
        'scorched',
        'sand',
        'snow',
        'leaves',
        'rubble',
        'bones',
        'ice',
        'water',
      ],
    },
    { label: 'Опасные', materials: ['lava', 'acid', 'swamp', 'fire'] },
  ];

export function materialGroups(): MaterialGroup[] {
  const listed = new Set(GROUPS.flatMap((group) => group.materials));
  const rest = (Object.keys(MATERIALS) as MaterialName[]).filter(
    (material) => !listed.has(material),
  );
  const groups = GROUPS.map((group) => ({
    label: group.label,
    materials: [...group.materials],
  }));
  return rest.length
    ? [...groups, { label: 'Прочие', materials: rest }]
    : groups;
}

// Блоки материала во всех формах, в порядке каталога (куб первым).
export function blocksOf(material: MaterialName): BlockDefinition[] {
  return [...BLOCK_CATALOG.values()].filter(
    (block) => block.material === material,
  );
}

const normalize = (text: string) =>
  text.toLocaleLowerCase('ru').replaceAll('ё', 'е');

// Поиск по названию: каждое слово запроса — начало какого-то слова названия, в любом
// порядке. «кам ступ» находит «Камень: ступени», «плит» — все плиты.
export function searchBlocks(query: string): BlockDefinition[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return [...BLOCK_CATALOG.values()].filter((block) => {
    const labelWords = normalize(block.label).split(/[\s:]+/);
    return words.every((word) =>
      labelWords.some((labelWord) => labelWord.startsWith(word)),
    );
  });
}
