import {
  BASE_BLOCKS,
  BLOCK_CATALOG,
  customBlockName,
  PLACEABLE_MATERIALS,
  SHAPE_NAMES,
  type BlockCatalog,
  type BlockDefinition,
  type BlockGroupInfo,
  type BlockInfo,
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
  const rest = PLACEABLE_MATERIALS.filter((material) => !listed.has(material));
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

// Свои группы каталога карты по названию (docs/plan/blocks.md, этап 6а).
export function ownGroups(catalog: BlockCatalog): BlockGroupInfo[] {
  return [...(catalog.groups ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  );
}

// Блоки своей группы во всех формах, куб первым — как blocksOf у базовых.
export function ownBlocksOf(
  catalog: BlockCatalog,
  groupId: string,
): BlockInfo[] {
  return SHAPE_NAMES.flatMap(
    (shape) => catalog.describe(customBlockName(groupId, shape)) ?? [],
  );
}

// Поиск по названию: каждое слово запроса — начало какого-то слова названия, в любом
// порядке. «кам ступ» находит «Камень: ступени», «плит» — все плиты. Свои блоки
// ищутся вместе с базовыми, первыми.
export function searchBlocks(
  query: string,
  catalog: BlockCatalog = BASE_BLOCKS,
): { name: string; label: string }[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const own = ownGroups(catalog).flatMap((group) =>
    ownBlocksOf(catalog, group.id),
  );
  return [...own, ...BLOCK_CATALOG.values()].filter((block) => {
    const labelWords = normalize(block.label).split(/[\s:]+/);
    return words.every((word) =>
      labelWords.some((labelWord) => labelWord.startsWith(word)),
    );
  });
}
