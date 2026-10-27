import type { EquipStats } from './equipment.js';
import type { WeaponDamage } from './itemEquipment.js';

// Магия надетого без настройки (docs/dnd/weapons-armor.md, «Магия без настройки»): предмет,
// который требует настройки, без неё даёт только обычные свойства — кубик урона, КД
// доспеха и щита, свойства оружия. Действуют только части с отметкой «Действует без
// настройки». Числа листа и игры считаются по уже урезанным полям, а что выключено —
// для строки «Нет настройки: …».

export interface InactiveMagic {
  // Бонус магии, который не действует; 0 — действует или его нет.
  bonus: number;
  extraDamage: WeaponDamage[];
}

export function activeStats(
  stats: EquipStats,
  attuned: boolean,
): { stats: EquipStats; inactive: InactiveMagic | null } {
  if (!stats.details.attunement || attuned) return { stats, inactive: null };
  const { magicBonus, bonusWithoutAttunement } = stats.details;
  const bonus = bonusWithoutAttunement ? 0 : magicBonus;
  const magicBonusLeft = magicBonus - bonus;
  if (stats.category === 'weapon') {
    const off = stats.details.extraDamage.filter((p) => !p.withoutAttunement);
    const inactive = { bonus, extraDamage: off.map(plainDamage) };
    return {
      stats: {
        ...stats,
        details: {
          ...stats.details,
          magicBonus: magicBonusLeft,
          extraDamage: stats.details.extraDamage.filter(
            (p) => p.withoutAttunement,
          ),
        },
      },
      inactive: bonus > 0 || off.length > 0 ? inactive : null,
    };
  }
  const details = { ...stats.details, magicBonus: magicBonusLeft };
  return {
    stats: { ...stats, details } as EquipStats,
    inactive: bonus > 0 ? { bonus, extraDamage: [] } : null,
  };
}

const plainDamage = ({ count, die, type }: WeaponDamage): WeaponDamage => ({
  count,
  die,
  type,
});
