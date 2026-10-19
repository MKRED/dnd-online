import type { AbilityCategory } from './abilities.js';
import type {
  AbilityActivation,
  AbilityActivationKind,
} from './abilityUsage.js';

// Категория «Монстра» (docs/plan/monsters-npcs.md, этап 2; правила — docs/dnd/monsters.md,
// «Usage limits»). Способности монстров живут в общем справочнике, но только у этой
// категории есть активации «Черта» и «Легендарное действие» и перезарядка.

// Активации, которые бывают только у способности «Монстра».
export const MONSTER_ACTIVATION_KINDS = [
  'trait',
  'legendary',
] as const satisfies readonly AbilityActivationKind[];

// «Перезарядка X–6»: в начале хода монстр бросает к6 и при X и выше способность
// возвращается. X = 6 — «Перезарядка 6».
export const RECHARGE_MIN = 2;
export const RECHARGE_MAX = 6;

// Поля категории в details. Перезарядка лежит здесь, а не в общих затратах: у затрат
// строгий набор ключей, и новый ключ сломал бы чтение уже сохранённых способностей.
export interface MonsterAbilityDetails {
  // Нижняя граница броска к6; null — без перезарядки.
  recharge: number | null;
}

export function isMonsterAbilityDetails(
  value: unknown,
): value is MonsterAbilityDetails {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  if (Object.keys(value).join(',') !== 'recharge') return false;
  const { recharge } = value as { recharge: unknown };
  return (
    recharge === null ||
    (Number.isInteger(recharge) &&
      (recharge as number) >= RECHARGE_MIN &&
      (recharge as number) <= RECHARGE_MAX)
  );
}

export const isMonsterActivation = (activation: AbilityActivation) =>
  (MONSTER_ACTIVATION_KINDS as readonly string[]).includes(activation.kind);

// Черта и легендарное действие — только у категории «Монстра».
export const activationFitsCategory = (
  category: AbilityCategory,
  activation: AbilityActivation,
) => category === 'monster' || !isMonsterActivation(activation);

export const formatRecharge = (recharge: number) =>
  recharge === RECHARGE_MAX
    ? `Перезарядка ${RECHARGE_MAX}`
    : `Перезарядка ${recharge}–${RECHARGE_MAX}`;
