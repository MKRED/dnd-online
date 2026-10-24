import { useEffect, type RefObject } from 'react';
import {
  CREATURE_KINDS,
  FIGURE_KINDS,
  FOG_EVENT_KINDS,
  type GameEvent,
  type GameFigureDragMessage,
  type GameSceneEditMessage,
  type GameSceneFogMessage,
} from 'shared';
import { useGameRoom } from '../../features/games';

// События, после которых страница перечитывает сцену: её сменили, перезапустили,
// открыли или закрыли (мастеру — чтобы переключатель совпадал с другой вкладкой),
// включили, выключили или сбросили туман войны, мастер поменял свои блоки на сцене — нужны новые
// описания блоков (docs/plan/blocks.md, этап 7).
const SCENE_CHANGES = new Set<string>([
  'scene.activated',
  'scene.restarted',
  'scene.opened',
  'scene.closed',
  'scene.fog',
  'scene.fogReset',
  'blocks.changed',
]);

// После них перечитываются фигурки (этап 7): ход, расстановка, ушедший с места персонаж
// и смена управляющего — кто может водить фигурку (canMove); хиты персонажа (этап 8) —
// метка здоровья и Скорость с эффектами.
const FIGURE_CHANGES = new Set<string>([
  ...FIGURE_KINDS,
  ...CREATURE_KINDS,
  'seat.controller',
  'seat.updated',
  'seat.freed',
  'member.left',
  'member.removed',
]);

interface SceneRoomProps {
  gameId: string;
  // Номер журнала, на котором страница впервые прочитала игру: с него комната догоняет.
  since: number;
  master: boolean;
  onReload: () => void;
  // Правка сцены мастером (этап 6): применить к копии или перечитать.
  onSceneEdit: (message: GameSceneEditMessage) => void;
  // Туман войны игрока изменился без правки сцены.
  onSceneFog: (message: GameSceneFogMessage) => void;
  // Мастеру: событие, после которого туман пересчитан, — «Глазами игроков» перечитывает
  // маски.
  onFogChanged?: () => void;
  // Фигурки изменились — перечитать их.
  onFigures: () => void;
  // Кто-то тянет фигурку — где она сейчас.
  onFigureDrag: (message: GameFigureDragMessage) => void;
  // Сюда комната кладёт отправку своих позиций перетаскивания.
  dragSenderRef: RefObject<((message: GameFigureDragMessage) => void) | null>;
  // Игроку закрыли сцену, его убрали из игры или игру удалили — в лобби.
  onLeave: () => void;
  // Мастеру: записи журнала для вкладки «Журнал» (docs/plan/done/scene-page.md, этап 7) —
  // новая запись и пропущенные после обрыва (null — перечитать журнал целиком).
  onEvents?: (events: GameEvent[]) => void;
  onMissed?: (missed: GameEvent[] | null) => void;
}

// Комната игры для страницы сцены. Отдельный компонент: входить в комнату можно только
// после первого чтения игры — иначе нечем догнать то, что случилось между ними.
function SceneRoom({
  gameId,
  since,
  master,
  onReload,
  onSceneEdit,
  onSceneFog,
  onFogChanged,
  onFigures,
  onFigureDrag,
  dragSenderRef,
  onLeave,
  onEvents,
  onMissed,
}: SceneRoomProps) {
  const { sendFigureDrag } = useGameRoom(
    gameId,
    {
      onChanged: (message) => {
        if (FOG_EVENT_KINDS.has(message.kind)) onFogChanged?.();
        if (!master && message.kind === 'scene.closed') onLeave();
        else if (SCENE_CHANGES.has(message.kind)) onReload();
        else if (FIGURE_CHANGES.has(message.kind)) onFigures();
      },
      onEvent: (event) => onEvents?.([event]),
      onSceneEdit,
      onSceneFog,
      onFigureDrag,
      onResync: (missed) => {
        onReload();
        onFigures();
        onMissed?.(missed);
      },
      onClosed: onLeave,
    },
    since,
  );
  useEffect(() => {
    dragSenderRef.current = sendFigureDrag;
    return () => {
      dragSenderRef.current = null;
    };
  }, [dragSenderRef, sendFigureDrag]);
  return null;
}

export default SceneRoom;
