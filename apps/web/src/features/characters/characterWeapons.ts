import {
  WEAPON_CATEGORIES,
  WEAPONS_BY_GROUP,
  type Weapon,
  type WeaponCategory,
  type WeaponGroup,
  type WeaponProficiency,
} from 'shared';

// Русские названия оружия и его категорий (docs/dnd/proficiencies.md). Во владении оружием
// хранится ключ; «Мастерство оружия» — свободный текст, туда названия идут как подсказки.

const CATEGORY_LABELS: Record<WeaponCategory, string> = {
  simple: 'Простое оружие',
  martial: 'Воинское оружие',
};

export const WEAPON_GROUP_LABELS: Record<WeaponGroup, string> = {
  simpleMelee: 'Простое рукопашное',
  simpleRanged: 'Простое дальнобойное',
  martialMelee: 'Воинское рукопашное',
  martialRanged: 'Воинское дальнобойное',
};

export const WEAPON_LABELS: Record<Weapon, string> = {
  quarterstaff: 'Боевой посох',
  mace: 'Булава',
  club: 'Дубинка',
  dagger: 'Кинжал',
  spear: 'Копьё',
  lightHammer: 'Лёгкий молот',
  javelin: 'Метательное копьё',
  handaxe: 'Одноручный топор',
  greatclub: 'Палица',
  sickle: 'Серп',
  dart: 'Дротик',
  shortbow: 'Короткий лук',
  lightCrossbow: 'Лёгкий арбалет',
  sling: 'Праща',
  halberd: 'Алебарда',
  warhammer: 'Боевой молот',
  battleaxe: 'Боевой топор',
  glaive: 'Глефа',
  greatsword: 'Двуручный меч',
  longsword: 'Длинный меч',
  lance: 'Кавалерийское копьё',
  warPick: 'Клевец',
  whip: 'Кнут',
  shortsword: 'Короткий меч',
  maul: 'Молот',
  morningstar: 'Моргенштерн',
  pike: 'Пика',
  rapier: 'Рапира',
  greataxe: 'Секира',
  scimitar: 'Скимитар',
  trident: 'Трезубец',
  flail: 'Цеп',
  longbow: 'Длинный лук',
  blowgun: 'Духовая трубка',
  musket: 'Мушкет',
  handCrossbow: 'Одноручный арбалет',
  pistol: 'Пистоль',
  heavyCrossbow: 'Тяжёлый арбалет',
};

// Названия для владений оружием — категорий и отдельного оружия; их показывает лист.
export const WEAPON_PROFICIENCY_LABELS: Record<WeaponProficiency, string> = {
  ...CATEGORY_LABELS,
  ...WEAPON_LABELS,
};

const WEAPON_GROUPS = Object.keys(WEAPONS_BY_GROUP) as WeaponGroup[];

// Варианты строгого выбора для поля «Оружие». Категории идут первыми: владение обычно
// дают целой категорией.
export const WEAPON_PROFICIENCY_OPTIONS = [
  {
    group: 'Категории',
    items: WEAPON_CATEGORIES.map((value) => ({
      value,
      label: CATEGORY_LABELS[value],
    })),
  },
  ...WEAPON_GROUPS.map((group) => ({
    group: WEAPON_GROUP_LABELS[group],
    items: WEAPONS_BY_GROUP[group].map((value) => ({
      value,
      label: WEAPON_LABELS[value],
    })),
  })),
];

// Подсказки для поля «Мастерство оружия»: своё оружие там можно вписать.
export const WEAPON_SUGGESTIONS = WEAPON_GROUPS.map((group) => ({
  group: WEAPON_GROUP_LABELS[group],
  items: WEAPONS_BY_GROUP[group].map((value) => WEAPON_LABELS[value]),
}));
