import { DAMAGE_DICE, DAMAGE_TYPES } from './damageTypes.js';
import {
  AMMUNITION_KINDS,
  ARMOR_CLASS_MAX,
  ARMOR_KINDS,
  ARMOR_STRENGTH_MAX,
  BOOK_ARMOR,
  ITEM_MAGIC_BONUS_MAX,
  MELEE_ONLY_PROPERTIES,
  RANGED_ONLY_PROPERTIES,
  SHIELD_BONUS_MAX,
  WEAPON_ATTACK_TYPES,
  WEAPON_DICE_MAX,
  WEAPON_EXTRA_DAMAGE_MAX,
  WEAPON_FLAGS,
  WEAPON_MASTERIES,
  WEAPON_RANGE_MAX,
  CLOTHING_SLOTS,
  JEWELRY_SLOTS,
} from './itemEquipment.js';
import type { ItemRarity } from './items.js';
import { WEAPON_CATEGORIES, WEAPONS_BY_GROUP } from './weapons.js';

// Проверка details категорий экипировки — у сервера (DTO) и в тестах. Возвращает текст
// ошибки для человека или null. Лишние ключи — ошибка: их шлёт только чужой клиент.

type Problem = string | null;
type Fields = Record<string, unknown>;

const ALL_WEAPONS: readonly string[] = Object.values(WEAPONS_BY_GROUP).flat();

const isIn = (list: readonly unknown[], value: unknown) => list.includes(value);
const isInt = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

function hasKeys(value: unknown, keys: string[]): value is Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const own = Object.keys(value).sort();
  const want = [...keys].sort();
  return own.length === want.length && own.every((key, i) => key === want[i]);
}

function magicProblem(fields: Fields, withBonus: boolean): Problem {
  if (typeof fields.attunement !== 'boolean')
    return 'Признак «Требует настройки» — да или нет';
  if (withBonus && !isInt(fields.magicBonus, 0, ITEM_MAGIC_BONUS_MAX))
    return `Бонус магии — от 0 до +${ITEM_MAGIC_BONUS_MAX}`;
  return null;
}

// Дистанция: обычная от 5 фт., наибольшая не меньше обычной, обе кратны 5.
function isRange(value: unknown, extra: string[] = []): boolean {
  if (!hasKeys(value, ['normal', 'long', ...extra])) return false;
  const { normal, long } = value;
  return (
    isInt(normal, 5, WEAPON_RANGE_MAX) &&
    isInt(long, normal as number, WEAPON_RANGE_MAX) &&
    (normal as number) % 5 === 0 &&
    (long as number) % 5 === 0
  );
}

function isDamage(value: unknown): boolean {
  if (!hasKeys(value, ['count', 'die', 'type'])) return false;
  return (
    isInt(value.count, 1, WEAPON_DICE_MAX) &&
    (value.die === null || isIn(DAMAGE_DICE, value.die)) &&
    isIn(DAMAGE_TYPES, value.type)
  );
}

const isDice = (value: unknown) =>
  hasKeys(value, ['count', 'die']) &&
  isInt(value.count, 1, WEAPON_DICE_MAX) &&
  isIn(DAMAGE_DICE, value.die);

// Свойства без повторов и в порядке списка: так запись одна на один набор свойств.
function isFlags(value: unknown): boolean {
  if (!Array.isArray(value) || !value.every((v) => isIn(WEAPON_FLAGS, v)))
    return false;
  const order = value.map((v) => WEAPON_FLAGS.indexOf(v));
  return order.every((at, i) => i === 0 || at > order[i - 1]);
}

const WEAPON_KEYS = [
  'base',
  'weaponCategory',
  'attackType',
  'damage',
  'extraDamage',
  'properties',
  'thrown',
  'ammunition',
  'versatile',
  'mastery',
  'magicBonus',
  'attunement',
];

export function weaponDetailsProblem(details: unknown): Problem {
  if (!hasKeys(details, WEAPON_KEYS)) return 'Поля оружия заполнены не все';
  const d = details;
  if (d.base !== null && !isIn(ALL_WEAPONS, d.base))
    return 'Неизвестный образец оружия';
  if (!isIn(WEAPON_CATEGORIES, d.weaponCategory))
    return 'Выберите, простое оружие или воинское';
  if (!isIn(WEAPON_ATTACK_TYPES, d.attackType))
    return 'Выберите, рукопашное оружие или дальнобойное';
  if (!isDamage(d.damage))
    return `Урон — от 1 до ${WEAPON_DICE_MAX} костей к4–к12 или число, и тип урона`;
  if (
    !Array.isArray(d.extraDamage) ||
    d.extraDamage.length > WEAPON_EXTRA_DAMAGE_MAX ||
    !d.extraDamage.every(isDamage)
  )
    return `Дополнительный урон — до ${WEAPON_EXTRA_DAMAGE_MAX} частей: от 1 до ${WEAPON_DICE_MAX} костей к4–к12 или число, и тип урона`;
  if (!isFlags(d.properties)) return 'Неизвестное свойство оружия';
  const has = (property: string) =>
    (d.properties as string[]).includes(property) ||
    (property in d && d[property] !== null);
  if (d.attackType === 'melee' && RANGED_ONLY_PROPERTIES.some(has))
    return 'Боеприпас и Перезарядка бывают только у дальнобойного оружия';
  if (d.attackType === 'ranged' && MELEE_ONLY_PROPERTIES.some(has))
    return 'Досягаемость и Универсальное бывают только у рукопашного оружия';
  if (d.thrown !== null && !isRange(d.thrown))
    return `Дистанция метания — от 5 до ${WEAPON_RANGE_MAX} фт., кратно 5, наибольшая не меньше обычной`;
  if (d.ammunition !== null) {
    if (!isRange(d.ammunition, ['kind']))
      return `Дистанция стрельбы — от 5 до ${WEAPON_RANGE_MAX} фт., кратно 5, наибольшая не меньше обычной`;
    if (!isIn(AMMUNITION_KINDS, (d.ammunition as Fields).kind))
      return 'Выберите вид боеприпаса';
  }
  if (d.versatile !== null && !isDice(d.versatile))
    return `Урон двумя руками — от 1 до ${WEAPON_DICE_MAX} костей к4–к12`;
  if (d.mastery !== null && !isIn(WEAPON_MASTERIES, d.mastery))
    return 'Неизвестное свойство мастерства';
  return magicProblem(d, true);
}

const ARMOR_KEYS = [
  'base',
  'kind',
  'armorClass',
  'strength',
  'stealthDisadvantage',
  'magicBonus',
  'attunement',
];

export function armorDetailsProblem(details: unknown): Problem {
  if (!hasKeys(details, ARMOR_KEYS)) return 'Поля доспеха заполнены не все';
  const d = details;
  if (d.base !== null && !isIn(BOOK_ARMOR, d.base))
    return 'Неизвестный образец доспеха';
  if (!isIn(ARMOR_KINDS, d.kind))
    return 'Выберите вид доспеха: лёгкий, средний или тяжёлый';
  if (!isInt(d.armorClass, 1, ARMOR_CLASS_MAX))
    return `КД доспеха — целое от 1 до ${ARMOR_CLASS_MAX}`;
  if (d.strength !== null && !isInt(d.strength, 1, ARMOR_STRENGTH_MAX))
    return `Требование Силы — целое от 1 до ${ARMOR_STRENGTH_MAX} или пусто`;
  if (typeof d.stealthDisadvantage !== 'boolean')
    return 'Помеха к Скрытности — да или нет';
  return magicProblem(d, true);
}

export function shieldDetailsProblem(details: unknown): Problem {
  if (!hasKeys(details, ['armorClass', 'magicBonus', 'attunement']))
    return 'Поля щита заполнены не все';
  if (!isInt(details.armorClass, 0, SHIELD_BONUS_MAX))
    return `Бонус щита к КД — целое от 0 до ${SHIELD_BONUS_MAX}`;
  return magicProblem(details, true);
}

export function clothingDetailsProblem(details: unknown): Problem {
  if (!hasKeys(details, ['slot', 'attunement']))
    return 'Поля одежды заполнены не все';
  if (!isIn(CLOTHING_SLOTS, details.slot))
    return 'Выберите место одежды: голова, плащ, тело, руки или ноги';
  return magicProblem(details, false);
}

export function jewelryDetailsProblem(details: unknown): Problem {
  if (!hasKeys(details, ['slot', 'attunement']))
    return 'Поля украшения заполнены не все';
  if (!isIn(JEWELRY_SLOTS, details.slot))
    return 'Выберите место украшения: амулет или кольцо';
  return magicProblem(details, false);
}

// Бонус магии и настройка — признаки магического предмета, а у него по книге есть
// редкость; «Без редкости» — немагический предмет (docs/dnd/weapons-armor.md).
export function equipmentRarityProblem(
  details: { attunement?: unknown; magicBonus?: unknown },
  rarity: ItemRarity,
): Problem {
  if (rarity !== 'none') return null;
  const magic = details.attunement === true || (details.magicBonus ?? 0) !== 0;
  return magic
    ? 'Бонус магии и настройка бывают только у магического предмета: выберите редкость'
    : null;
}
