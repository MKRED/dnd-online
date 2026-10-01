import { SHAPE_LABELS, SHAPE_NAMES, type ShapeName } from './shapes.js';

// Материал задаёт вид и игровые свойства блока. Форма берётся отдельно (shapes.ts),
// а укрытие и проходимость правила выводят из коробок формы, а не хранят здесь.
export interface BlockMaterial {
  label: string;
  // Пока вместо текстур — цвет; атлас текстур появится позже.
  color: string;
  // Перекрывает ли обзор (стекло и лёд — нет).
  opaque: boolean;
  // КД и ХП блока как объекта; null — атаками не разрушается (грунт).
  durability: { armorClass: number; hitPoints: number } | null;
  flammable: boolean;
  // 2 — труднопроходимая местность (каждый фут движения стоит 2).
  movementCost: 1 | 2;
  climbable: boolean;
}

// Прочность — по таблицам объектов DMG: КД по материалу, ХП как у крупного объекта
// (прочный 27, хрупкий 11).
export const MATERIALS = {
  stone: {
    label: 'Камень',
    color: '#8a8a8a',
    opaque: true,
    durability: { armorClass: 17, hitPoints: 27 },
    flammable: false,
    movementCost: 1,
    climbable: false,
  },
  brick: {
    label: 'Кирпич',
    color: '#9c4a3a',
    opaque: true,
    durability: { armorClass: 17, hitPoints: 27 },
    flammable: false,
    movementCost: 1,
    climbable: false,
  },
  wood: {
    label: 'Дерево',
    color: '#9a6b3f',
    opaque: true,
    durability: { armorClass: 15, hitPoints: 27 },
    flammable: true,
    movementCost: 1,
    climbable: false,
  },
  dirt: {
    label: 'Земля',
    color: '#6b4a2b',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
  },
  grass: {
    label: 'Трава',
    color: '#4f8a3a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
  },
  sand: {
    label: 'Песок',
    color: '#d6c08a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
  },
  glass: {
    label: 'Стекло',
    color: '#a8d8e8',
    opaque: false,
    durability: { armorClass: 13, hitPoints: 11 },
    flammable: false,
    movementCost: 1,
    climbable: false,
  },
  ice: {
    label: 'Лёд',
    color: '#cfeefa',
    opaque: false,
    durability: { armorClass: 13, hitPoints: 11 },
    flammable: false,
    movementCost: 2,
    climbable: false,
  },
} as const satisfies Record<string, BlockMaterial>;

export type MaterialName = keyof typeof MATERIALS;

export interface BlockDefinition {
  name: string;
  label: string;
  material: MaterialName;
  shape: ShapeName;
}

// Имя блока — материал для куба («stone») и «материал_форма» для остальных («stone_stairs»).
// Каталог — все сочетания; позже сюда добавятся блоки из билдера.
function buildCatalog(): Map<string, BlockDefinition> {
  const catalog = new Map<string, BlockDefinition>();
  for (const material of Object.keys(MATERIALS) as MaterialName[]) {
    for (const shape of SHAPE_NAMES) {
      const name = shape === 'cube' ? material : `${material}_${shape}`;
      const label =
        shape === 'cube'
          ? MATERIALS[material].label
          : `${MATERIALS[material].label}: ${SHAPE_LABELS[shape].toLowerCase()}`;
      catalog.set(name, { name, label, material, shape });
    }
  }
  return catalog;
}

export const BLOCK_CATALOG: ReadonlyMap<string, BlockDefinition> =
  buildCatalog();

export function getBlock(name: string): BlockDefinition | undefined {
  return BLOCK_CATALOG.get(name);
}
