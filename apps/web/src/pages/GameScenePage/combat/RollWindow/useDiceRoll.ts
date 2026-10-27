import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import type { D20Roll, RollMode } from 'shared';
import { errorMessage } from '../../../../lib/apiRequest';

// Сколько кость крутится хотя бы (макет «Окно броска»): ответ сервера приходит быстрее, а
// бросок должен успеть стать событием. Без анимации — сразу.
export const ROLL_SPIN_MS = 900;
// Как часто мелькает число на грани, пока кость крутится.
const FLICKER_MS = 70;

export type DiceRollPhase =
  | { kind: 'ready'; error: string | null }
  | { kind: 'rolling'; face: number }
  | { kind: 'done'; roll: D20Roll };

// Бросок в окне: кнопка шлёт запрос и крутит кость, пока не придут и ответ, и конец
// анимации. Ошибка возвращает окно к кнопке.
export function useDiceRoll(
  onRoll: (mode: RollMode | null) => Promise<D20Roll>,
) {
  const [phase, setPhase] = useState<DiceRollPhase>({
    kind: 'ready',
    error: null,
  });
  const reduced = useReducedMotion();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const rolling = phase.kind === 'rolling';
  useEffect(() => {
    if (!rolling) return;
    const timer = window.setInterval(
      () =>
        setPhase({ kind: 'rolling', face: 1 + Math.floor(Math.random() * 20) }),
      FLICKER_MS,
    );
    return () => window.clearInterval(timer);
  }, [rolling]);

  const roll = (mode: RollMode | null) => {
    if (phase.kind === 'rolling') return;
    setPhase({ kind: 'rolling', face: 20 });
    const spin = new Promise((resolve) =>
      window.setTimeout(resolve, reduced ? 0 : ROLL_SPIN_MS),
    );
    Promise.all([onRoll(mode), spin])
      .then(([result]) => {
        if (alive.current) setPhase({ kind: 'done', roll: result });
      })
      .catch((err: unknown) => {
        console.error('Failed to roll initiative', err);
        if (alive.current) {
          setPhase({
            kind: 'ready',
            error: errorMessage(err, 'Не удалось бросить кубик'),
          });
        }
      });
  };

  return { phase, roll };
}
