// Модификатор характеристики по правилам 5e: нужен и листу, и вычислителям эффектов
// (базовый КД Mage Armor — 13 + модификатор Ловкости).
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
