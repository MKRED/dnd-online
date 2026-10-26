import {
  ARMOR_CLASS_MAX,
  ARMOR_STRENGTH_MAX,
  SHIELD_BONUS_MAX,
  WEAPON_DICE_MAX,
  WEAPON_RANGE_MAX,
  type ItemCategory,
} from 'shared';
import type { EquipmentFormValues } from './equipmentFormValues';
import { chipFits, type WeaponPropertyChip } from './weaponPropertyChips';

// Правила полей экипировки для useForm — те же, что у сервера (itemEquipmentCheck в
// shared), тексты короче: каждый стоит под своим полем.

type Values = EquipmentFormValues & { category: ItemCategory };
type NumberValue = number | string;

const intIn = (value: NumberValue, min: number, max: number) =>
  value !== '' &&
  Number.isInteger(Number(value)) &&
  Number(value) >= min &&
  Number(value) <= max;

const when =
  <V>(
    category: ItemCategory,
    rule: (value: V, values: Values) => string | null,
  ) =>
  (value: V, values: Values) =>
    values.category === category ? rule(value, values) : null;

const withChip = <V = NumberValue>(
  chip: WeaponPropertyChip,
  rule: (value: V, values: Values) => string | null,
) =>
  when<V>('weapon', (value, values) =>
    values.weapon.properties.includes(chip) &&
    chipFits(chip, values.weapon.attackType)
      ? rule(value, values)
      : null,
  );

const normalRange = (value: NumberValue) =>
  intIn(value, 5, WEAPON_RANGE_MAX) && Number(value) % 5 === 0
    ? null
    : `От 5 до ${WEAPON_RANGE_MAX} фт., кратно 5`;

const longRange = (normal: NumberValue) => (value: NumberValue) => {
  const problem = normalRange(value);
  if (problem) return problem;
  return Number(value) < Number(normal) ? 'Не меньше обычной' : null;
};

const diceCount = (value: NumberValue) =>
  intIn(value, 1, WEAPON_DICE_MAX) ? null : `От 1 до ${WEAPON_DICE_MAX}`;

const slotRule = (value: string | null) =>
  value === null ? 'Выберите место' : null;

const damageType = (value: string | null) =>
  value === null ? 'Выберите тип урона' : null;

export const equipmentRules = {
  weapon: {
    damageCount: when<NumberValue>('weapon', diceCount),
    damageType: when<string | null>('weapon', damageType),
    // Правила списка Mantine применяет к каждой строке.
    extraDamage: {
      count: when<NumberValue>('weapon', diceCount),
      type: when<string | null>('weapon', damageType),
    },
    thrownNormal: withChip('thrown', normalRange),
    thrownLong: withChip('thrown', (value, values) =>
      longRange(values.weapon.thrownNormal)(value),
    ),
    ammoNormal: withChip('ammunition', normalRange),
    ammoLong: withChip('ammunition', (value, values) =>
      longRange(values.weapon.ammoNormal)(value),
    ),
    ammoKind: withChip<string | null>('ammunition', (value) =>
      value === null ? 'Выберите боеприпас' : null,
    ),
    versatileCount: withChip('versatile', diceCount),
  },
  armor: {
    armorClass: when<NumberValue>('armor', (value) =>
      intIn(value, 1, ARMOR_CLASS_MAX)
        ? null
        : `Целое от 1 до ${ARMOR_CLASS_MAX}`,
    ),
    strength: when<NumberValue>('armor', (value) =>
      value === '' || intIn(value, 1, ARMOR_STRENGTH_MAX)
        ? null
        : `Целое от 1 до ${ARMOR_STRENGTH_MAX} или пусто`,
    ),
  },
  shieldArmorClass: when<NumberValue>('shield', (value) =>
    intIn(value, 0, SHIELD_BONUS_MAX)
      ? null
      : `Целое от 0 до ${SHIELD_BONUS_MAX}`,
  ),
  clothingSlot: when<string | null>('clothing', slotRule),
  jewelrySlot: when<string | null>('jewelry', slotRule),
};
