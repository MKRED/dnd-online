import {
  COINS,
  ITEM_CATEGORIES,
  ITEM_PACK_MAX_ENTRIES,
  ITEM_RARITIES,
  ITEM_SATIETY_MAX,
  TREASURE_KINDS,
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
} satisfies Record<ItemCategory, string>;

export const itemGuide = () => [
  'ПРЕДМЕТ (kind item)',
  ...fieldLines(FIELDS),
  '',
  'DETAILS ПО КАТЕГОРИЯМ',
  ...fieldLines(DETAILS),
  '',
  'Зелья, свитки, оружие и доспехи своих категорий пока не имеют: это basic, свойства — в описании.',
];
