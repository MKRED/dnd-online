// Кости сервера по заказу для e2e боя: тест кладёт числа [0, 1) в очередь, randomInt из
// node:crypto (им бросает только бой, combat-initiative.ts) берёт их по одному, а пустая
// очередь — настоящий случай. Подключается в файле теста:
//   vi.mock('node:crypto', async (original) =>
//     (await import('./support/combat-dice.js')).withDice(await original()));
export const dice = { queue: [] as number[] };

// Грань f к20 и наибольшая грань любой кости.
export const d20 = (face: number) => (face - 0.5) / 20;
export const MAX_DIE = 0.999;

type Crypto = typeof import('node:crypto');

export function withDice(original: Crypto): Crypto {
  const randomInt = ((min: number, max: number) => {
    const next = dice.queue.shift();
    return next === undefined
      ? original.randomInt(min, max)
      : min + Math.floor(next * (max - min));
  }) as Crypto['randomInt'];
  return {
    ...original,
    randomInt,
    default: { ...original, randomInt },
  } as Crypto;
}
