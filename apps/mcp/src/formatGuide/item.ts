import {
  AMMUNITION_KINDS,
  ARMOR_KINDS,
  BOOK_ARMOR,
  COINS,
  ITEM_CATEGORIES,
  ITEM_PACK_MAX_ENTRIES,
  ITEM_RARITIES,
  ITEM_SATIETY_MAX,
  TREASURE_KINDS,
  WEAPON_FLAGS,
  WEAPON_MASTERIES,
  WEAPONS_BY_GROUP,
  WEAR_SLOTS,
  type Item,
  type ItemCategory,
} from 'shared';
import { fieldLines, list } from './common.js';

type ItemInputKey = Exclude<
  keyof Item,
  | 'id'
  | 'authorId'
  | 'authorNickname'
  | 'image'
  | 'packs'
  | 'holders'
  | 'createdAt'
  | 'updatedAt'
>;

const FIELDS = {
  name: 'название, до 100 символов',
  category: `категория: ${list(ITEM_CATEGORIES)}`,
  details: 'поля категории, см. ниже',
  rarity: `редкость: ${list(ITEM_RARITIES)}; у немагического снаряжения none, common — уже магический предмет`,
  weight: 'вес в фунтах, до сотых; 0 — без веса',
  cost: `стоимость {amount, coin} (coin: ${list(COINS)}) или null`,
  description:
    'описание: всё, для чего у категории нет своих полей (свойства, действие зелья)',
  sources: 'источники — строки: книга со страницей или ссылка',
  isPublic: 'false (create ставит сам)',
} satisfies Record<ItemInputKey, string>;

const DETAILS = {
  basic: '{} — всё прочее',
  material: '{} — материалы и компоненты',
  quest: '{} — квестовый предмет',
  food: `{satiety} — очки насыщения, целое 0..${ITEM_SATIETY_MAX}`,
  treasure: `{kind} — ${list(TREASURE_KINDS)}`,
  container: '{capacity} — сколько фунтов вмещает, или null',
  pack: `{contents: [{itemId, quantity}]} — набор снаряжения из других предметов каталога, до ${ITEM_PACK_MAX_ENTRIES} строк`,
  weapon: `{base, weaponCategory, attackType, damage, properties, thrown, ammunition, versatile, mastery, magicBonus, attunement} — оружие; все ключи обязательны. base — образец книги (${list(Object.values(WEAPONS_BY_GROUP).flat())}) или null; weaponCategory simple|martial; attackType melee|ranged; damage {count 1..10, die 4|6|8|10|12 или null — урон числом, type — тип урона}; properties — без повторов и по порядку из ${list(WEAPON_FLAGS)}; thrown {normal, long} в футах кратно 5 или null; ammunition {normal, long, kind: ${list(AMMUNITION_KINDS)}} или null; versatile {count, die} — урон двумя руками или null; mastery ${list(WEAPON_MASTERIES)} или null; magicBonus 0..3`,
  armor: `{base, kind, armorClass, strength, stealthDisadvantage, magicBonus, attunement} — доспех: base ${list(BOOK_ARMOR)} или null; kind ${list(ARMOR_KINDS)} (Ловкость к КД из вида: лёгкий полностью, средний до 2, тяжёлый нет); armorClass — базовый КД без Ловкости; strength — нужная Сила или null; magicBonus 0..3`,
  shield:
    '{armorClass, magicBonus, attunement} — щит: armorClass — прибавка к КД (у щита книги 2); magicBonus 0..3',
  wearable: `{slot, attunement} — одежда и украшения на кукле: slot ${list(WEAR_SLOTS)}; body — одежда вместо доспеха`,
} satisfies Record<ItemCategory, string>;

export const itemGuide = () => [
  'ПРЕДМЕТ (kind item)',
  ...fieldLines(FIELDS),
  '',
  'DETAILS ПО КАТЕГОРИЯМ',
  ...fieldLines(DETAILS),
  '',
  'Бонус магии и attunement (требует настройки) — только у магического предмета: rarity не none. Особые свойства магического оружия пишут в описании.',
  'Зелья и свитки своих категорий пока не имеют: это basic, свойства — в описании.',
];
