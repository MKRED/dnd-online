import {
  DAMAGE_TYPE_LABELS,
  type AmmunitionKind,
  type ArmorKind,
  type BookArmor,
  type WeaponAttackType,
  type WeaponDamage,
  type WeaponDice,
  type WeaponFlag,
  type WeaponMastery,
  type WeaponRange,
  type WearSlot,
} from 'shared';

// Русские названия экипировки — по next.dnd.su, «Оружие и доспехи» (проверено 2026-10-26,
// docs/dnd/weapons-armor.md).

export const WEAPON_FLAG_LABELS: Record<WeaponFlag, string> = {
  finesse: 'Фехтовальное',
  heavy: 'Тяжёлое',
  light: 'Лёгкое',
  loading: 'Перезарядка',
  reach: 'Досягаемость',
  twoHanded: 'Двуручное',
};

export const WEAPON_MASTERY_LABELS: Record<WeaponMastery, string> = {
  cleave: 'Прорубающее',
  graze: 'Секущее',
  nick: 'Быстрое',
  push: 'Отталкивающее',
  sap: 'Ослабляющее',
  slow: 'Замедляющее',
  topple: 'Опрокидывающее',
  vex: 'Отвлекающее',
};

export const AMMUNITION_LABELS: Record<AmmunitionKind, string> = {
  arrow: 'Стрелы',
  bolt: 'Болты',
  firearmBullet: 'Пули',
  slingBullet: 'Снаряды для пращи',
  needle: 'Иглы',
};

export const ATTACK_TYPE_LABELS: Record<WeaponAttackType, string> = {
  melee: 'Рукопашное',
  ranged: 'Дальнобойное',
};

export const ARMOR_KIND_LABELS: Record<ArmorKind, string> = {
  light: 'Лёгкий',
  medium: 'Средний',
  heavy: 'Тяжёлый',
};

export const BOOK_ARMOR_LABELS: Record<BookArmor, string> = {
  padded: 'Стёганый доспех',
  leather: 'Кожаный доспех',
  studdedLeather: 'Проклёпанный кожаный доспех',
  hide: 'Шкурный доспех',
  chainShirt: 'Кольчужная рубаха',
  scaleMail: 'Чешуйчатый доспех',
  breastplate: 'Кираса',
  halfPlate: 'Полулаты',
  ringMail: 'Колечный доспех',
  chainMail: 'Кольчужный доспех',
  splint: 'Пластинчатый доспех',
  plate: 'Латный доспех',
};

// Места как слоты Baldur's Gate 3 (решено с пользователем 2026-10-26).
export const WEAR_SLOT_LABELS: Record<WearSlot, string> = {
  head: 'Голова',
  cloak: 'Плащ',
  body: 'Тело',
  hands: 'Руки',
  feet: 'Ноги',
  amulet: 'Амулет',
  ring: 'Кольцо',
};

export const WEAR_SLOT_HINTS: Record<WearSlot, string> = {
  head: 'Шлем, обруч, капюшон',
  cloak: 'Плащ, накидка',
  body: 'Одежда или мантия: тот же слот, что у доспеха, но без КД',
  hands: 'Перчатки, наручи',
  feet: 'Сапоги',
  amulet: 'Амулет, брошь',
  ring: 'Кольцо: на кукле их два',
};

// «+1» к числу; ноль — пусто.
const plus = (bonus: number) => (bonus > 0 ? ` + ${bonus}` : '');

export const formatDice = ({ count, die }: WeaponDice) => `${count}к${die}`;

// «1к8 + 1 рубящий»; у духовой трубки урон числом — «1 колющий».
export function formatDamage(damage: WeaponDamage, bonus = 0): string {
  const roll =
    damage.die === null
      ? String(damage.count + bonus)
      : `${formatDice({ count: damage.count, die: damage.die })}${plus(bonus)}`;
  return `${roll} ${DAMAGE_TYPE_LABELS[damage.type].toLowerCase()}`;
}

export const formatVersatile = (dice: WeaponDice, bonus = 0) =>
  `${formatDice(dice)}${plus(bonus)}`;

// Как в книге: «дист. 80/320».
export const formatRange = ({ normal, long }: WeaponRange) =>
  `дист. ${normal}/${long}`;
