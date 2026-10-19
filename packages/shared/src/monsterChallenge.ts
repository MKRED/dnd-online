// Показатель опасности (ПО) монстра и что из него следует: опыт и бонус мастерства. Таблица
// — по книге 2024 (docs/dnd/monsters.md, «Challenge Rating»). Ключи — строки, а не дроби
// в числах, чтобы jsonb хранил «1/8» точно.

interface ChallengeRow {
  xp: number;
  proficiencyBonus: number;
}

// У ПО 0 в книге «0 или 10» опыта: 10 — если у монстра есть действенная атака. В таблице 0,
// карточка показывает «0 или 10», как книга (formatChallengeXp; решено с пользователем
// 2026-10-19).
const CHALLENGE_TABLE = {
  '0': { xp: 0, proficiencyBonus: 2 },
  '1/8': { xp: 25, proficiencyBonus: 2 },
  '1/4': { xp: 50, proficiencyBonus: 2 },
  '1/2': { xp: 100, proficiencyBonus: 2 },
  '1': { xp: 200, proficiencyBonus: 2 },
  '2': { xp: 450, proficiencyBonus: 2 },
  '3': { xp: 700, proficiencyBonus: 2 },
  '4': { xp: 1100, proficiencyBonus: 2 },
  '5': { xp: 1800, proficiencyBonus: 3 },
  '6': { xp: 2300, proficiencyBonus: 3 },
  '7': { xp: 2900, proficiencyBonus: 3 },
  '8': { xp: 3900, proficiencyBonus: 3 },
  '9': { xp: 5000, proficiencyBonus: 4 },
  '10': { xp: 5900, proficiencyBonus: 4 },
  '11': { xp: 7200, proficiencyBonus: 4 },
  '12': { xp: 8400, proficiencyBonus: 4 },
  '13': { xp: 10000, proficiencyBonus: 5 },
  '14': { xp: 11500, proficiencyBonus: 5 },
  '15': { xp: 13000, proficiencyBonus: 5 },
  '16': { xp: 15000, proficiencyBonus: 5 },
  '17': { xp: 18000, proficiencyBonus: 6 },
  '18': { xp: 20000, proficiencyBonus: 6 },
  '19': { xp: 22000, proficiencyBonus: 6 },
  '20': { xp: 25000, proficiencyBonus: 6 },
  '21': { xp: 33000, proficiencyBonus: 7 },
  '22': { xp: 41000, proficiencyBonus: 7 },
  '23': { xp: 50000, proficiencyBonus: 7 },
  '24': { xp: 62000, proficiencyBonus: 7 },
  '25': { xp: 75000, proficiencyBonus: 8 },
  '26': { xp: 90000, proficiencyBonus: 8 },
  '27': { xp: 105000, proficiencyBonus: 8 },
  '28': { xp: 120000, proficiencyBonus: 8 },
  '29': { xp: 135000, proficiencyBonus: 9 },
  '30': { xp: 155000, proficiencyBonus: 9 },
} as const satisfies Record<string, ChallengeRow>;

export type MonsterChallenge = keyof typeof CHALLENGE_TABLE;

// По возрастанию: так их показывают выбор в форме и фильтр справочника. Списком, а не
// Object.keys: ключи-числа объект ставит раньше «1/8».
export const MONSTER_CHALLENGES: readonly MonsterChallenge[] = [
  '0',
  '1/8',
  '1/4',
  '1/2',
  ...Array.from({ length: 30 }, (_, i) => String(i + 1) as MonsterChallenge),
];

export const isMonsterChallenge = (value: unknown): value is MonsterChallenge =>
  typeof value === 'string' && Object.hasOwn(CHALLENGE_TABLE, value);

export const challengeXp = (challenge: MonsterChallenge) =>
  CHALLENGE_TABLE[challenge].xp;

export const challengeProficiencyBonus = (challenge: MonsterChallenge) =>
  CHALLENGE_TABLE[challenge].proficiencyBonus;

// Опыт для карточки: «0 или 10» у ПО 0, иначе число с разрядами через неразрывный пробел
// («5 900»), как в русских книгах.
export const formatChallengeXp = (challenge: MonsterChallenge) =>
  challenge === '0'
    ? '0 или 10'
    : String(challengeXp(challenge)).replace(/\B(?=(\d{3})+$)/g, ' ');
