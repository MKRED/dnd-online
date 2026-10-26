import type { ItemCost } from './items.js';
import type { WeaponItemDetails } from './itemEquipment.js';
import { WEAPONS_BY_GROUP, type Weapon, type WeaponGroup } from './weapons.js';

// Таблица оружия книги 2024 (свободные правила, Equipment, проверено 2026-10-26;
// docs/dnd/weapons-armor.md). Форма предмета заполняет из неё поля по выбранному образцу.

type BookWeaponStats = Pick<
  WeaponItemDetails,
  | 'damage'
  | 'extraDamage'
  | 'properties'
  | 'thrown'
  | 'ammunition'
  | 'versatile'
  | 'mastery'
> & { weight: number; cost: ItemCost };

export type BookWeapon = BookWeaponStats &
  Pick<WeaponItemDetails, 'weaponCategory' | 'attackType'>;

const gp = (amount: number): ItemCost => ({ amount, coin: 'gp' });
const sp = (amount: number): ItemCost => ({ amount, coin: 'sp' });
const cp = (amount: number): ItemCost => ({ amount, coin: 'cp' });
const range = (normal: number, long: number) => ({ normal, long });

// Строка таблицы короче записи: пустые параметры свойств подставляет weapon().
function weapon(
  damage: WeaponItemDetails['damage'],
  mastery: WeaponItemDetails['mastery'],
  weight: number,
  cost: ItemCost,
  extra: Partial<
    Pick<
      WeaponItemDetails,
      'properties' | 'thrown' | 'ammunition' | 'versatile'
    >
  > = {},
): BookWeaponStats {
  return {
    damage,
    extraDamage: [],
    properties: extra.properties ?? [],
    thrown: extra.thrown ?? null,
    ammunition: extra.ammunition ?? null,
    versatile: extra.versatile ?? null,
    mastery,
    weight,
    cost,
  };
}

const STATS: Record<Weapon, BookWeaponStats> = {
  club: weapon({ count: 1, die: 4, type: 'bludgeoning' }, 'slow', 2, sp(1), {
    properties: ['light'],
  }),
  dagger: weapon({ count: 1, die: 4, type: 'piercing' }, 'nick', 1, gp(2), {
    properties: ['finesse', 'light'],
    thrown: range(20, 60),
  }),
  greatclub: weapon(
    { count: 1, die: 8, type: 'bludgeoning' },
    'push',
    10,
    sp(2),
    { properties: ['twoHanded'] },
  ),
  handaxe: weapon({ count: 1, die: 6, type: 'slashing' }, 'vex', 2, gp(5), {
    properties: ['light'],
    thrown: range(20, 60),
  }),
  javelin: weapon({ count: 1, die: 6, type: 'piercing' }, 'slow', 2, sp(5), {
    thrown: range(30, 120),
  }),
  lightHammer: weapon(
    { count: 1, die: 4, type: 'bludgeoning' },
    'nick',
    2,
    gp(2),
    { properties: ['light'], thrown: range(20, 60) },
  ),
  mace: weapon({ count: 1, die: 6, type: 'bludgeoning' }, 'sap', 4, gp(5)),
  quarterstaff: weapon(
    { count: 1, die: 6, type: 'bludgeoning' },
    'topple',
    4,
    sp(2),
    { versatile: { count: 1, die: 8 } },
  ),
  sickle: weapon({ count: 1, die: 4, type: 'slashing' }, 'nick', 2, gp(1), {
    properties: ['light'],
  }),
  spear: weapon({ count: 1, die: 6, type: 'piercing' }, 'sap', 3, gp(1), {
    thrown: range(20, 60),
    versatile: { count: 1, die: 8 },
  }),
  dart: weapon({ count: 1, die: 4, type: 'piercing' }, 'vex', 0.25, cp(5), {
    properties: ['finesse'],
    thrown: range(20, 60),
  }),
  lightCrossbow: weapon(
    { count: 1, die: 8, type: 'piercing' },
    'slow',
    5,
    gp(25),
    {
      properties: ['loading', 'twoHanded'],
      ammunition: { ...range(80, 320), kind: 'bolt' },
    },
  ),
  shortbow: weapon({ count: 1, die: 6, type: 'piercing' }, 'vex', 2, gp(25), {
    properties: ['twoHanded'],
    ammunition: { ...range(80, 320), kind: 'arrow' },
  }),
  // Вес в книге «—»: без веса.
  sling: weapon({ count: 1, die: 4, type: 'bludgeoning' }, 'slow', 0, sp(1), {
    ammunition: { ...range(30, 120), kind: 'slingBullet' },
  }),
  battleaxe: weapon(
    { count: 1, die: 8, type: 'slashing' },
    'topple',
    4,
    gp(10),
    { versatile: { count: 1, die: 10 } },
  ),
  flail: weapon({ count: 1, die: 8, type: 'bludgeoning' }, 'sap', 2, gp(10)),
  glaive: weapon({ count: 1, die: 10, type: 'slashing' }, 'graze', 6, gp(20), {
    properties: ['heavy', 'reach', 'twoHanded'],
  }),
  greataxe: weapon(
    { count: 1, die: 12, type: 'slashing' },
    'cleave',
    7,
    gp(30),
    { properties: ['heavy', 'twoHanded'] },
  ),
  greatsword: weapon(
    { count: 2, die: 6, type: 'slashing' },
    'graze',
    6,
    gp(50),
    { properties: ['heavy', 'twoHanded'] },
  ),
  halberd: weapon(
    { count: 1, die: 10, type: 'slashing' },
    'cleave',
    6,
    gp(20),
    { properties: ['heavy', 'reach', 'twoHanded'] },
  ),
  // В книге «Двуручное (если не верхом)»: оговорку про езду пишут в описании.
  lance: weapon({ count: 1, die: 10, type: 'piercing' }, 'topple', 6, gp(10), {
    properties: ['heavy', 'reach', 'twoHanded'],
  }),
  longsword: weapon({ count: 1, die: 8, type: 'slashing' }, 'sap', 3, gp(15), {
    versatile: { count: 1, die: 10 },
  }),
  maul: weapon(
    { count: 2, die: 6, type: 'bludgeoning' },
    'topple',
    10,
    gp(10),
    {
      properties: ['heavy', 'twoHanded'],
    },
  ),
  morningstar: weapon({ count: 1, die: 8, type: 'piercing' }, 'sap', 4, gp(15)),
  pike: weapon({ count: 1, die: 10, type: 'piercing' }, 'push', 18, gp(5), {
    properties: ['heavy', 'reach', 'twoHanded'],
  }),
  rapier: weapon({ count: 1, die: 8, type: 'piercing' }, 'vex', 2, gp(25), {
    properties: ['finesse'],
  }),
  scimitar: weapon({ count: 1, die: 6, type: 'slashing' }, 'nick', 3, gp(25), {
    properties: ['finesse', 'light'],
  }),
  shortsword: weapon({ count: 1, die: 6, type: 'piercing' }, 'vex', 2, gp(10), {
    properties: ['finesse', 'light'],
  }),
  trident: weapon({ count: 1, die: 8, type: 'piercing' }, 'topple', 4, gp(5), {
    thrown: range(20, 60),
    versatile: { count: 1, die: 10 },
  }),
  warhammer: weapon(
    { count: 1, die: 8, type: 'bludgeoning' },
    'push',
    5,
    gp(15),
    { versatile: { count: 1, die: 10 } },
  ),
  warPick: weapon({ count: 1, die: 8, type: 'piercing' }, 'sap', 2, gp(5), {
    versatile: { count: 1, die: 10 },
  }),
  whip: weapon({ count: 1, die: 4, type: 'slashing' }, 'slow', 3, gp(2), {
    properties: ['finesse', 'reach'],
  }),
  blowgun: weapon({ count: 1, die: null, type: 'piercing' }, 'vex', 1, gp(10), {
    properties: ['loading'],
    ammunition: { ...range(25, 100), kind: 'needle' },
  }),
  handCrossbow: weapon(
    { count: 1, die: 6, type: 'piercing' },
    'vex',
    3,
    gp(75),
    {
      properties: ['light', 'loading'],
      ammunition: { ...range(30, 120), kind: 'bolt' },
    },
  ),
  heavyCrossbow: weapon(
    { count: 1, die: 10, type: 'piercing' },
    'push',
    18,
    gp(50),
    {
      properties: ['heavy', 'loading', 'twoHanded'],
      ammunition: { ...range(100, 400), kind: 'bolt' },
    },
  ),
  longbow: weapon({ count: 1, die: 8, type: 'piercing' }, 'slow', 2, gp(50), {
    properties: ['heavy', 'twoHanded'],
    ammunition: { ...range(150, 600), kind: 'arrow' },
  }),
  musket: weapon({ count: 1, die: 12, type: 'piercing' }, 'slow', 10, gp(500), {
    properties: ['loading', 'twoHanded'],
    ammunition: { ...range(40, 120), kind: 'firearmBullet' },
  }),
  pistol: weapon({ count: 1, die: 10, type: 'piercing' }, 'vex', 3, gp(250), {
    properties: ['loading'],
    ammunition: { ...range(30, 90), kind: 'firearmBullet' },
  }),
};

const GROUP_KIND: Record<
  WeaponGroup,
  Pick<WeaponItemDetails, 'weaponCategory' | 'attackType'>
> = {
  simpleMelee: { weaponCategory: 'simple', attackType: 'melee' },
  simpleRanged: { weaponCategory: 'simple', attackType: 'ranged' },
  martialMelee: { weaponCategory: 'martial', attackType: 'melee' },
  martialRanged: { weaponCategory: 'martial', attackType: 'ranged' },
};

// Вид оружия (простое/воинское, рукопашное/дальнобойное) — из группы WEAPONS_BY_GROUP.
export const BOOK_WEAPONS = Object.fromEntries(
  (Object.keys(WEAPONS_BY_GROUP) as WeaponGroup[]).flatMap((group) =>
    WEAPONS_BY_GROUP[group].map((key) => [
      key,
      { ...GROUP_KIND[group], ...STATS[key] },
    ]),
  ),
) as Record<Weapon, BookWeapon>;
