// Сцена рисует кадры по требованию (frameloop="demand"), а анимация (призрак над гробом)
// каждым кадром просит следующий — и пока она видна, перерисовывается вся сцена. На
// 60 кадрах в секунду это заметно грузит процессор, а медленному покачиванию столько не
// нужно. Поэтому анимации идут со своей частотой из настроек графики (animationFps:
// 0 — без анимаций, у набора «среднее» — 18 кадров в секунду, на глаз почти не отличить).
// Движение камеры рисуется с полной частотой (или с пределом кадров, FrameLimiter): его
// кадры просит она сама.

// Ждущий следующий кадр анимаций — один на сцену (по её invalidate): несколько призраков
// не должны умножать кадры.
const pending = new WeakMap<() => void, ReturnType<typeof setTimeout>>();

export function requestAnimationFrameAt(
  invalidate: () => void,
  fps: number,
): void {
  if (fps <= 0) return;
  if (fps >= 60) {
    invalidate();
    return;
  }
  if (pending.has(invalidate)) return;
  pending.set(
    invalidate,
    setTimeout(() => {
      pending.delete(invalidate);
      invalidate();
    }, 1000 / fps),
  );
}
