import type { GraphicsQuality } from 'shared';

// Сцена рисует кадры по требованию (frameloop="demand"), а анимация (призрак над гробом)
// каждым кадром просит следующий — и пока она видна, перерисовывается вся сцена. На
// 60 кадрах в секунду это заметно грузит процессор, а медленному покачиванию столько не
// нужно. Поэтому частота анимаций зависит от качества графики: «низкое» — без анимаций,
// «среднее» — 18 кадров в секунду (на глаз почти не отличить), «высокое» — каждый кадр.
// Движение камеры по-прежнему рисуется с полной частотой: его кадры просит она сама.
export const ANIMATION_FPS: Record<GraphicsQuality, number> = {
  low: 0,
  medium: 18,
  high: 60,
};

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
