import { HAZARDS, type MaterialHazard } from './materialHazards.js';

// Материал задаёт вид и игровые свойства блока. Форма берётся отдельно (shapes.ts),
// а укрытие и проходимость правила выводят из коробок формы, а не хранят здесь.
export interface BlockMaterial {
  label: string;
  // Основной цвет: средний цвет текстуры блока (её рисует веб, render/textures/), им же
  // рисуются значки и серая зона тумана (docs/plan/blocks.md).
  color: string;
  // Перекрывает ли обзор (стекло и лёд — нет).
  opaque: boolean;
  // КД и ХП блока как объекта; null — атаками не разрушается (грунт).
  durability: { armorClass: number; hitPoints: number } | null;
  flammable: boolean;
  // 2 — труднопроходимая местность (каждый фут движения стоит 2).
  movementCost: 1 | 2;
  climbable: boolean;
  // Урон тому, кто стоит на блоке (materialHazards.ts); null — безопасный.
  hazard: MaterialHazard | null;
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
    hazard: null,
  },
  brick: {
    label: 'Кирпич',
    color: '#9c4a3a',
    opaque: true,
    durability: { armorClass: 17, hitPoints: 27 },
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  wood: {
    label: 'Дерево',
    color: '#9a6b3f',
    opaque: true,
    durability: { armorClass: 15, hitPoints: 27 },
    flammable: true,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  dirt: {
    label: 'Земля',
    color: '#6b4a2b',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  grass: {
    label: 'Трава',
    color: '#4f8a3a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  sand: {
    label: 'Песок',
    color: '#d6c08a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  glass: {
    label: 'Стекло',
    color: '#a8d8e8',
    opaque: false,
    durability: { armorClass: 13, hitPoints: 11 },
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  ice: {
    label: 'Лёд',
    color: '#cfeefa',
    opaque: false,
    durability: { armorClass: 13, hitPoints: 11 },
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: null,
  },
  // Опасные блоки — твёрдый пол, по которому бредут (жидкостей-объёмов пока нет):
  // жидкости труднопроходимы, как жидкость от голени до пояса. Числа — docs/dnd/hazards.md.
  lava: {
    label: 'Лава',
    color: '#e8591a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: HAZARDS.lava,
  },
  acid: {
    label: 'Кислота',
    color: '#9fd23c',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: HAZARDS.acid,
  },
  swamp: {
    label: 'Ядовитая топь',
    color: '#5b6b2e',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: HAZARDS.swamp,
  },
  // Горящая земля, угли: не жидкость, поэтому шаг обычный.
  fire: {
    label: 'Огонь',
    color: '#f2b233',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: HAZARDS.fire,
  },
  water: {
    label: 'Вода',
    color: '#3a78c9',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: null,
  },
  // Блоки для подземелий, руин и тёмного фэнтези; откуда их свойства — docs/dnd/terrain.md.
  cobble: {
    label: 'Булыжник',
    color: '#7c7a74',
    opaque: true,
    durability: { armorClass: 17, hitPoints: 27 },
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  darkstone: {
    label: 'Тёмный камень',
    color: '#3d3b42',
    opaque: true,
    durability: { armorClass: 17, hitPoints: 27 },
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  mossy: {
    label: 'Мшистый камень',
    color: '#6c7658',
    opaque: true,
    durability: { armorClass: 17, hitPoints: 27 },
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  darkwood: {
    label: 'Тёмное дерево',
    color: '#4b3727',
    opaque: true,
    durability: { armorClass: 15, hitPoints: 27 },
    flammable: true,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  scorched: {
    label: 'Выжженная земля',
    color: '#3b302a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  path: {
    label: 'Тропа',
    color: '#8c6d47',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  // Неглубокий снег: по нему ходят как обычно, глубокий был бы труднопроходимым.
  snow: {
    label: 'Снег',
    color: '#e8eef3',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 1,
    climbable: false,
    hazard: null,
  },
  rubble: {
    label: 'Обломки',
    color: '#78716a',
    opaque: true,
    durability: null,
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: null,
  },
  // Кости — как обломки (труднопроходимые), прочность как у дерева: домашнее правило.
  bones: {
    label: 'Кости',
    color: '#a39880',
    opaque: true,
    durability: { armorClass: 15, hitPoints: 27 },
    flammable: false,
    movementCost: 2,
    climbable: false,
    hazard: null,
  },
  // Листва сквозная для взгляда (умеренная листва книги лишь слегка заслоняет), ходить по ней — как по подлеску.
  leaves: {
    label: 'Листва',
    color: '#3f6d2f',
    opaque: false,
    durability: { armorClass: 11, hitPoints: 11 },
    flammable: true,
    movementCost: 2,
    climbable: false,
    hazard: null,
  },
} as const satisfies Record<string, BlockMaterial>;

export type MaterialName = keyof typeof MATERIALS;
