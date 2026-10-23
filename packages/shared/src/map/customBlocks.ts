import { BASE_BLOCKS, type BlockCatalog, type BlockInfo } from './blockInfo.js';
import { HAZARDS } from './materialHazards.js';
import type { MaterialName } from './materials.js';
import { SHAPE_LABELS, SHAPE_NAMES, type ShapeName } from './shapes.js';

export type HazardName = keyof typeof HAZARDS;

// Свои текстуры группы (docs/plan/blocks.md, этап 4б): плитка 16×16 на верх, бока и низ,
// каждая — base64 пикселей RGBA строками сверху вниз (1024 байта). Альфа только 0 или
// 255: дыры, как у листвы, без полупрозрачности. Одна текстура на все грани — три
// одинаковые строки.
export interface BlockTextures {
  top: string;
  side: string;
  bottom: string;
}

export const BLOCK_TEXTURE_FACES = ['top', 'side', 'bottom'] as const;

// Свой вид отдельной формы группы (docs/plan/blocks.md, этап 5б): ступени или плита
// со своими плитками вместо текстур группы. Куба тут нет — его вид и есть вид группы.
// color — основной цвет формы (средний цвет её плиток): им рисуются значок, серая зона
// тумана и срез для нейросети.
export type ShapeLookName = Exclude<ShapeName, 'cube'>;
export const SHAPE_LOOK_NAMES = SHAPE_NAMES.filter(
  (shape): shape is ShapeLookName => shape !== 'cube',
);

export interface BlockShapeLook {
  textures: BlockTextures;
  color: string;
}

export type BlockShapeLooks = Partial<Record<ShapeLookName, BlockShapeLook>>;
export const HAZARD_NAMES = Object.keys(HAZARDS) as HazardName[];

// Группа своих блоков из справочника (docs/plan/blocks.md, этап 3): свойства для правил
// общие у всех форм группы. Вид — базовый материал, чьи текстуры рисуются, пока у группы
// нет своих (этап 4), и основной цвет.
export interface BlockGroupInfo {
  id: string;
  name: string;
  look: MaterialName;
  color: string;
  opaque: boolean;
  durability: { armorClass: number; hitPoints: number } | null;
  flammable: boolean;
  movementCost: 1 | 2;
  climbable: boolean;
  hazard: HazardName | null;
  // null — узор основы, перекрашенный в основной цвет.
  textures: BlockTextures | null;
  // Формы со своим видом; остальные формы рисуются текстурами группы.
  shapes: BlockShapeLooks;
}

// Имя своего блока в палитре — как у базовых: id группы для куба, «id_форма» для
// остальных. В uuid нет подчёркиваний, а базовые имена — латинские слова, поэтому имена
// не пересекаются, и старые карты с базовыми именами не нужно переписывать.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// В имени формы бывает подчёркивание (slab_top).
const CUSTOM_NAME = new RegExp(`^(${UUID})(?:_([a-z_]+))?$`);

export function customBlockName(groupId: string, shape: ShapeName): string {
  return shape === 'cube' ? groupId : `${groupId}_${shape}`;
}

export function parseCustomBlockName(
  name: string,
): { groupId: string; shape: ShapeName } | null {
  const match = CUSTOM_NAME.exec(name);
  if (!match) return null;
  const shape = (match[2] ?? 'cube') as ShapeName;
  if (shape === 'cube' && match[2] !== undefined) return null;
  return SHAPE_NAMES.includes(shape) ? { groupId: match[1], shape } : null;
}

function describeCustom(
  group: BlockGroupInfo,
  shape: ShapeName,
  name: string,
): BlockInfo {
  const own = shape === 'cube' ? undefined : group.shapes[shape];
  const textures = own?.textures ?? group.textures;
  return {
    name,
    label:
      shape === 'cube'
        ? group.name
        : `${group.name}: ${SHAPE_LABELS[shape].toLowerCase()}`,
    shape,
    material: group.look,
    ...(textures && { textures }),
    // Формы без своего вида делят плитки группы, со своим — у каждой свои.
    tiles: own ? name : group.id,
    traits: {
      label: group.name,
      color: own?.color ?? group.color,
      opaque: group.opaque,
      durability: group.durability,
      flammable: group.flammable,
      movementCost: group.movementCost,
      climbable: group.climbable,
      hazard: group.hazard ? HAZARDS[group.hazard] : null,
    },
  };
}

// Каталог карты: базовые блоки и свои группы её владельца. Блок удалённой группы
// каталог не описывает — для правил и отрисовки это воздух, а поставить его нельзя.
export function createBlockCatalog(groups: BlockGroupInfo[]): BlockCatalog {
  if (!groups.length) return BASE_BLOCKS;
  const byId = new Map(groups.map((group) => [group.id, group]));
  const described = new Map<string, BlockInfo | undefined>();
  return {
    describe(name) {
      const base = BASE_BLOCKS.describe(name);
      if (base) return base;
      if (!described.has(name)) {
        const parsed = parseCustomBlockName(name);
        const group = parsed && byId.get(parsed.groupId);
        described.set(
          name,
          group ? describeCustom(group, parsed.shape, name) : undefined,
        );
      }
      return described.get(name);
    },
  };
}
