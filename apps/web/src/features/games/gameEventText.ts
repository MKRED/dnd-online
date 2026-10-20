import type {
  GameEvent,
  GameEventPayloads,
  SceneReplayResult,
  SceneEditResult,
} from 'shared';

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
    case 'session.started': {
      // У записей до библиотеки игры (этап 4) итога нет.
      const copied = event.result?.libraryCopied ?? 0;
      return copied > 0
        ? `Встреча началась, в библиотеку скопировано записей: ${copied}`
        : 'Встреча началась';
    }
    case 'session.ended':
      return 'Встреча закончилась';
    case 'library.refreshed': {
      const { name, copied } = event.result;
      return copied > 0
        ? `Обновлено из справочника: ${name}, докопировано связей: ${copied}`
        : `Обновлено из справочника: ${name}`;
    }
    case 'scene.created': {
      const { scene, libraryCopied, active } = event.result;
      const parts = [`Сцена добавлена: ${scene.name}`];
      if (active) parts.push('она активная');
      if (libraryCopied > 0)
        parts.push(`в библиотеку скопировано записей: ${libraryCopied}`);
      return parts.join(', ');
    }
    case 'scene.activated':
      return `Активная сцена: ${event.result.scene.name}`;
    case 'scene.restarted': {
      const { scene, libraryCopied } = event.result;
      return libraryCopied > 0
        ? `Сцена перезапущена: ${scene.name}, в библиотеку скопировано записей: ${libraryCopied}`
        : `Сцена перезапущена: ${scene.name}`;
    }
    case 'scene.opened':
      return `Сцена открыта игрокам: ${event.result.scene.name}`;
    case 'scene.closed':
      return event.result.scene
        ? `Сцена закрыта от игроков: ${event.result.scene.name}`
        : 'Сцена закрыта от игроков';
    case 'scene.edited': {
      const { libraryCopied } = event.result;
      const text = `Сцена изменена: ${sceneEdit(event.result)}`;
      return libraryCopied > 0
        ? `${text}, в библиотеку скопировано записей: ${libraryCopied}`
        : text;
    }
    case 'scene.undone':
      return `Правка №${event.intent.seq} отменена: ${sceneReplay(event.result)}`;
    case 'scene.redone':
      return `Правка №${event.intent.seq} возвращена: ${sceneReplay(event.result)}`;
    case 'figures.placed':
      return figuresPlaced(event.intent.reason, event.result);
    case 'figure.moved': {
      const { character, cost, left } = event.result;
      return `Ход: ${character.name} — ${cost} фт, осталось ${left} фт`;
    }
    case 'figure.placed':
      return event.result.from
        ? `Фигурка переставлена: ${event.result.character.name}`
        : `Фигурка поставлена на сцену: ${event.result.character.name}`;
    case 'figures.round':
      return `Новый раунд: запас движения снова полный у фигурок: ${event.result.count}`;
    case 'figure.refreshed':
      return `Запас движения обновлён: ${event.result.character.name}`;
    case 'figure.dashed': {
      const { character, dashes } = event.result;
      return dashes > 1
        ? `Рывок: ${character.name} (за ход: ${dashes})`
        : `Рывок: ${character.name}`;
    }
    case 'member.left':
      return withCharacter('Выход из игры', event.result.character);
    case 'member.removed':
      return withCharacter(
        `Убран из игры: ${event.result.member.nickname}`,
        event.result.character,
      );
  }
}

// «Пещера (клеток: 12, объектов: 1)» — что задела правка сцены.
function sceneEdit({ scene, cells, objects }: SceneEditResult) {
  const parts = [];
  if (cells > 0) parts.push(`клеток: ${cells}`);
  if (objects > 0) parts.push(`объектов: ${objects}`);
  return parts.length > 0 ? `${scene.name} (${parts.join(', ')})` : scene.name;
}

// Отмена и возврат: что не тронуто, потому что это изменили уже после правки.
function sceneReplay(result: SceneReplayResult) {
  const text = sceneEdit(result);
  return result.conflicts > 0
    ? `${text}, не тронуто изменённого позже: ${result.conflicts}`
    : text;
}

type FiguresPlaced = GameEventPayloads['figures.placed'];

// Фигурки встали на стартовые точки: вся сцена разом или один севший на место.
function figuresPlaced(
  reason: FiguresPlaced['intent']['reason'],
  { scene, placed, unplaced }: FiguresPlaced['result'],
) {
  const standing = placed.map((entry) => entry.character.name).join(', ');
  const left = unplaced.map((character) => character.name).join(', ');
  if (reason === 'seat') {
    return placed.length > 0
      ? `Фигурка на стартовой точке: ${standing}`
      : `Фигурке не хватило стартовой точки: ${left}`;
  }
  const parts = [];
  if (placed.length > 0) parts.push(`на стартовых точках: ${standing}`);
  if (unplaced.length > 0) parts.push(`не хватило точки: ${left}`);
  return `Фигурки сцены ${scene.name} — ${parts.join('; ')}`;
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
