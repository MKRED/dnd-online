import { useEffect, useRef, useState } from 'react';
import type { GameMoveMode } from 'shared';

// Сколько уведомление о смене режима или встречи висит на сцене.
export const MODE_NOTICE_MS = 8000;

export interface ModeNotice {
  title: string;
  text: string;
}

const MODE_NOTICES: Record<GameMoveMode, ModeNotice> = {
  tactical: {
    title: 'Мастер начал бой',
    text: 'Ходят по очереди инициативы — она над сценой.',
  },
  free: {
    title: 'Бой окончен',
    text: 'Ходите свободно: до своей Скорости за ход, сколько угодно раз.',
  },
};

// Ключ — «идёт ли встреча»: вне неё игрок только смотрит (docs/dnd/movement.md, «Outside a
// session»).
const SESSION_NOTICES: Record<'on' | 'off', ModeNotice> = {
  off: {
    title: 'Мастер завершил встречу',
    text: 'Сцену можно только смотреть.',
  },
  on: { title: 'Встреча началась', text: 'Можно ходить.' },
};

// Уведомление о смене значения. Первое прочтение — не смена: игрок, вошедший посреди боя,
// видит плашку боя, но не «Мастер начал бой».
function useChangeNotice<K extends string>(
  value: K | null,
  notices: Record<K, ModeNotice>,
  show: (notice: ModeNotice) => void,
) {
  const previous = useRef<K | null>(null);
  useEffect(() => {
    if (value === null) return;
    const before = previous.current;
    previous.current = value;
    if (before !== null && before !== value) show(notices[value]);
  }, [value, notices, show]);
}

// Уведомление игроку, когда мастер сменил режим хода или начал и закончил встречу. Оно одно:
// новое заменяет прежнее.
export function useModeNotice(
  mode: GameMoveMode | null,
  watchOnly: boolean | null = null,
) {
  const [notice, setNotice] = useState<ModeNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), MODE_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useChangeNotice(mode, MODE_NOTICES, setNotice);
  useChangeNotice(
    watchOnly === null ? null : watchOnly ? 'off' : 'on',
    SESSION_NOTICES,
    setNotice,
  );
  return { notice, close: () => setNotice(null) };
}
