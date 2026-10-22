// Шкала среза: уровень ↔ доля высоты дорожки (0 — низ, 1 — верх).

export function levelToFraction(level: number, min: number, max: number) {
  return max > min ? (level - min) / (max - min) : 1;
}

// Ближайший уровень к доле высоты, прижатый к пределам.
export function fractionToLevel(fraction: number, min: number, max: number) {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  return Math.round(min + clamped * (max - min));
}

export const clampLevel = (level: number, min: number, max: number) =>
  Math.min(Math.max(level, min), max);

// Уровни с засечкой: каждый, пока их немного, иначе каждый пятый — засечки не должны
// слипаться в сплошную полосу на высокой карте.
export function tickLevels(min: number, max: number): number[] {
  const step = max - min <= 24 ? 1 : 5;
  const levels: number[] = [];
  for (let y = Math.ceil(min / step) * step; y <= max; y += step) {
    levels.push(y);
  }
  return levels;
}
