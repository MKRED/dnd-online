import type { AttackOption } from './attackOptions.js';

// Досягаемость и дистанция (docs/dnd/attacks-and-saves.md, «Attack bonus, damage, range and
// reach»): ближняя — до досягаемости, дальняя — до обычной дистанции без помехи, до
// дальней с помехой, дальше — нельзя. distance — футы до ближайшей клетки цели.
export type RangeBand = 'normal' | 'long' | 'out';

export function rangeBand(
  option: Pick<AttackOption, 'reach' | 'range'>,
  distance: number,
): RangeBand {
  if (option.range) {
    if (distance <= option.range.normal) return 'normal';
    return distance <= option.range.long ? 'long' : 'out';
  }
  return distance <= (option.reach ?? 0) ? 'normal' : 'out';
}

// Предел атаки строкой — для подсказки «вне досягаемости»: «5 фт.», «80/320 фт.».
export function attackReachText(
  option: Pick<AttackOption, 'reach' | 'range'>,
): string {
  if (option.range) return `${option.range.normal}/${option.range.long} фт.`;
  return `${option.reach ?? 0} фт.`;
}
