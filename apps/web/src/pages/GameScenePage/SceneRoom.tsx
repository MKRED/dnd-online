import { useEffect, type RefObject } from 'react';
import {
  FIGURE_KINDS,
  type GameFigureDragMessage,
  type GameSceneEditMessage,
} from 'shared';
import { useGameRoom } from '../../features/games';

// События, после которых страница перечитывает сцену: её сменили, перезапустили,
// открыли или закрыли (мастеру — чтобы переключатель совпадал с другой вкладкой).
const SCENE_CHANGES = new Set<string>([
  'scene.activated',
  'scene.restarted',
  'scene.opened',
  'scene.closed',
]);

// После них перечитываются фигурки (этап 7): ход, расстановка, ушедший с места персонаж
// и смена управляющего — кто может водить фигурку (canMove).
const FIGURE_CHANGES = new Set<string>([
  ...FIGURE_KINDS,
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
  // Фигурки изменились — перечитать их.
  onFigures: () => void;
  // Кто-то тянет фигурку — где она сейчас.
  onFigureDrag: (message: GameFigureDragMessage) => void;
  // Сюда комната кладёт отправку своих позиций перетаскивания.
  dragSenderRef: RefObject<((message: GameFigureDragMessage) => void) | null>;
  // Игроку закрыли сцену, его убрали из игры или игру удалили — в лобби.
  onLeave: () => void;
}

// Комната игры для страницы сцены. Отдельный компонент: входить в комнату можно только
// после первого чтения игры — иначе нечем догнать то, что случилось между ними.
function SceneRoom({
  gameId,
  since,
  master,
  onReload,
  onSceneEdit,
  onFigures,
  onFigureDrag,
  dragSenderRef,
  onLeave,
}: SceneRoomProps) {
  const { sendFigureDrag } = useGameRoom(
    gameId,
    {
      onChanged: (message) => {
        if (!master && message.kind === 'scene.closed') onLeave();
        else if (SCENE_CHANGES.has(message.kind)) onReload();
        else if (FIGURE_CHANGES.has(message.kind)) onFigures();
      },
      onSceneEdit,
      onFigureDrag,
      onResync: () => {
        onReload();
        onFigures();
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
