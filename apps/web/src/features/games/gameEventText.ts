import type { GameEvent } from 'shared';

// Строка журнала игры по-русски. Кто сделал, показывается рядом отдельно, поэтому здесь —
// безличные фразы: пол автора по нику не угадать.
export function gameEventText(event: GameEvent): string {
  switch (event.kind) {
    case 'game.created': {
      const { name, seatCount, hasPassword } = event.intent;
      const access = hasPassword ? 'с паролем' : 'открытая';
      return `Игра «${name}» создана: мест ${seatCount}, ${access}`;
    }
    case 'member.entered':
      return 'Вход в лобби';
    case 'seat.taken':
      return `Место занято: ${event.result.character.name}`;
    case 'seat.updated':
      return event.intent.allowHandover
        ? `Передача управления разрешена: ${event.result.character.name}`
        : `Передача управления запрещена: ${event.result.character.name}`;
    case 'seat.freed':
      return event.result.reason === 'character_deleted'
        ? `Персонаж удалён, место освобождено: ${event.result.character.name}`
        : `Место освобождено: ${event.result.character.name}`;
    case 'session.started':
      return 'Встреча началась';
    case 'session.ended':
      return 'Встреча закончилась';
    case 'member.left':
      return withCharacter('Выход из игры', event.result.character);
    case 'member.removed':
      return withCharacter(
        `Убран из игры: ${event.result.member.nickname}`,
        event.result.character,
      );
  }
}

function withCharacter(text: string, character: { name: string } | null) {
  return character ? `${text} (место ${character.name} освобождено)` : text;
}

// Время записи: день и время — журнал живёт много встреч.
export function gameEventTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
