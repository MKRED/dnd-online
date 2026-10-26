import { useRef, type MouseEvent } from 'react';
import type { Participant } from './ParticipantRow';
import { selectionKey } from './participantGroups';

// Сколько ждать второго щелчка: дольше, чем системный двойной щелчок по умолчанию.
const DOUBLE_MS = 600;

// Двойной щелчок по строке — окно карточки. Первый щелчок выбирает, карточка выбранного
// встаёт над списком (или уходит) и сдвигает его, так что второй попадает уже в другую
// строку, в заголовок группы или в саму карточку: окно открываем тому, по кому щёлкнули
// первым. Поэтому второй щелчок ловится на всей вкладке (catch — на onClickCapture), до
// строк, заголовков и карточки.
export function useDoubleOpen(
  selectedKey: string | null,
  onSelect: (participant: Participant) => void,
  onOpen: (participant: Participant) => (() => void) | undefined,
) {
  const firstClick = useRef<Participant | null>(null);
  const firstAt = useRef(0);
  const catchSecond = (event: MouseEvent) => {
    const first = firstClick.current;
    if (
      event.detail >= 2 &&
      first &&
      event.timeStamp - firstAt.current < DOUBLE_MS
    ) {
      event.stopPropagation();
      firstClick.current = null;
      if (selectedKey !== selectionKey(first)) onSelect(first);
      onOpen(first)?.();
      return;
    }
    // Новый щелчок: строка под ним (если это строка) запомнит себя при всплытии.
    firstClick.current = null;
    firstAt.current = event.timeStamp;
  };
  const click = (participant: Participant) => {
    firstClick.current = participant;
    onSelect(participant);
  };
  return { catchSecond, click };
}
