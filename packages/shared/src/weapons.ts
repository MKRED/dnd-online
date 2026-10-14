// Оружие редакции 2024 (docs/proficiencies.md): 38 видов из свободных правил по четырём
// группам. Это ключи для хранения; русские названия живут в web (characterWeapons.ts).
export const WEAPONS_BY_GROUP = {
  simpleMelee: [
    'quarterstaff',
    'mace',
    'club',
    'dagger',
    'spear',
    'lightHammer',
    'javelin',
    'handaxe',
    'greatclub',
    'sickle',
  ],
  simpleRanged: ['dart', 'shortbow', 'lightCrossbow', 'sling'],
  martialMelee: [
    'halberd',
    'warhammer',
    'battleaxe',
    'glaive',
    'greatsword',
    'longsword',
    'lance',
    'warPick',
    'whip',
    'shortsword',
    'maul',
    'morningstar',
    'pike',
    'rapier',
    'greataxe',
    'scimitar',
    'trident',
    'flail',
  ],
  martialRanged: [
    'longbow',
    'blowgun',
    'musket',
    'handCrossbow',
    'pistol',
    'heavyCrossbow',
  ],
} as const;
export type WeaponGroup = keyof typeof WEAPONS_BY_GROUP;
export type Weapon = (typeof WEAPONS_BY_GROUP)[WeaponGroup][number];

// Владение обычно дают целой категорией: простым или воинским оружием.
export const WEAPON_CATEGORIES = ['simple', 'martial'] as const;
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];

// Всё, что можно записать во владение оружием: категория или отдельный вид оружия.
export const WEAPON_PROFICIENCIES: readonly (WeaponCategory | Weapon)[] = [
  ...WEAPON_CATEGORIES,
  ...Object.values(WEAPONS_BY_GROUP).flat(),
];
export type WeaponProficiency = (typeof WEAPON_PROFICIENCIES)[number];
