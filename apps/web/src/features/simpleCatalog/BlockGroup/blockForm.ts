import {
  BLOCK_ARMOR_CLASS_MAX,
  BLOCK_HIT_POINTS_MAX,
  MATERIALS,
  type BlockGroupFields,
  type BlockTextures,
  type HazardName,
  type MaterialName,
} from 'shared';

// Поля группы блоков в форме (docs/plan/blocks.md, этап 4). Прочность — переключатель
// и два числа: так КД и ХП не теряются, если переключатель сняли и вернули.
export interface BlockValues {
  look: MaterialName;
  color: string;
  opaque: boolean;
  difficult: boolean;
  climbable: boolean;
  flammable: boolean;
  hazard: HazardName | 'none';
  breakable: boolean;
  armorClass: number | string;
  hitPoints: number | string;
  // Свои текстуры (этап 4б); null — узор основы в основном цвете.
  textures: BlockTextures | null;
}

// Новая группа начинается как камень: самый частый блок, и у него все свойства обычные.
const NEW_GROUP: BlockGroupFields = {
  look: 'stone',
  color: MATERIALS.stone.color,
  opaque: true,
  durability: MATERIALS.stone.durability,
  flammable: false,
  movementCost: 1,
  climbable: false,
  hazard: null,
  textures: null,
};

export function toBlockValues(
  group: BlockGroupFields = NEW_GROUP,
): BlockValues {
  const durability = group.durability ?? MATERIALS[group.look].durability;
  return {
    look: group.look,
    color: group.color,
    opaque: group.opaque,
    difficult: group.movementCost === 2,
    climbable: group.climbable,
    flammable: group.flammable,
    hazard: group.hazard ?? 'none',
    breakable: group.durability !== null,
    armorClass: durability?.armorClass ?? '',
    hitPoints: durability?.hitPoints ?? '',
    textures: group.textures,
  };
}

export function fromBlockValues(values: BlockValues): BlockGroupFields {
  return {
    look: values.look,
    color: values.color.toLowerCase(),
    opaque: values.opaque,
    durability: values.breakable
      ? {
          armorClass: Number(values.armorClass),
          hitPoints: Number(values.hitPoints),
        }
      : null,
    flammable: values.flammable,
    movementCost: values.difficult ? 2 : 1,
    climbable: values.climbable,
    hazard: values.hazard === 'none' ? null : values.hazard,
    textures: values.textures,
  };
}

const inRange = (value: number | string, max: number) => {
  const number = Number(value);
  return (
    value !== '' && Number.isInteger(number) && number >= 1 && number <= max
  );
};

// Те же пределы, что у сервера (BlockGroupDto). Числа прочности проверяются, только
// когда блок разрушается: иначе они в запрос не уходят.
export const blockValidate = {
  color: (value: string) =>
    /^#[0-9a-f]{6}$/i.test(value) ? null : 'Цвет — в виде #rrggbb',
  armorClass: (value: number | string, values: { block: BlockValues }) =>
    !values.block.breakable || inRange(value, BLOCK_ARMOR_CLASS_MAX)
      ? null
      : `КД — целое от 1 до ${BLOCK_ARMOR_CLASS_MAX}`,
  hitPoints: (value: number | string, values: { block: BlockValues }) =>
    !values.block.breakable || inRange(value, BLOCK_HIT_POINTS_MAX)
      ? null
      : `ХП — целое от 1 до ${BLOCK_HIT_POINTS_MAX}`,
};

// Основа сменилась — основной цвет идёт за ней, если его не меняли руками (он равен
// цвету прежней основы). Свой цвет пользователя не трогаем.
export function colorAfterLookChange(
  values: BlockValues,
  look: MaterialName,
): string {
  return values.color.toLowerCase() === MATERIALS[values.look].color
    ? MATERIALS[look].color
    : values.color;
}
