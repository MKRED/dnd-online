import { useEffect, useRef, useState } from 'react';
import type { GameMoveMode } from 'shared';

// Сколько уведомление о смене режима висит на сцене.
export const MODE_NOTICE_MS = 8000;

export interface ModeNotice {
  title: string;
  text: string;
}

const NOTICES: Record<GameMoveMode, ModeNotice> = {
  tactical: {
    title: 'Мастер начал бой',
    text: 'У всех новый ход. Ход кончится — ждите нового раунда.',
  },
  free: {
    title: 'Бой окончен',
    text: 'Ходите свободно: до своей Скорости за ход, сколько угодно раз.',
  },
};

// Уведомление игроку, когда мастер сменил режим хода. Первое прочтение сцены — не смена:
// игрок, вошедший посреди боя, видит плашку боя, но не «Мастер начал бой».
export function useModeNotice(mode: GameMoveMode | null) {
  const [notice, setNotice] = useState<ModeNotice | null>(null);
  const previous = useRef<GameMoveMode | null>(null);
  useEffect(() => {
    if (mode === null) return;
    const before = previous.current;
    previous.current = mode;
    if (before === null || before === mode) return;
    setNotice(NOTICES[mode]);
    const timer = window.setTimeout(() => setNotice(null), MODE_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);
  return { notice, close: () => setNotice(null) };
}
