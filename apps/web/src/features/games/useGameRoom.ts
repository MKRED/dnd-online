import { useEffect, useRef, useState } from 'react';
import {
  GAME_SOCKET,
  type GameChangedMessage,
  type GameClosedMessage,
  type GameEvent,
  type GameEventMessage,
  type GameJoinAck,
  type GamePresenceMessage,
  type GameSceneEditMessage,
} from 'shared';
import { acquireGameSocket, releaseGameSocket } from './gameSocket';

export interface GameRoomHandlers {
  // В игре что-то изменилось — лобби перечитывает себя.
  onChanged?: (message: GameChangedMessage) => void;
  // Мастеру: новая запись журнала.
  onEvent?: (event: GameEvent) => void;
  // Вернулись после обрыва и что-то пропустили. missed — пропущенные записи у мастера;
  // null — их не прислали (не мастер или слишком много), перечитать всё.
  onResync?: (missed: GameEvent[] | null) => void;
  onClosed?: (reason: GameClosedMessage['reason']) => void;
  // Правка сцены (этап 6): мастеру — целиком, игроку — то, что ему видно.
  onSceneEdit?: (message: GameSceneEditMessage) => void;
}

// Комната игры на сокете: живые изменения и кто сейчас в лобби. Одна комната на
// страницу — второй хук на ту же игру при размонтировании вывел бы из неё весь сокет.
// since — номер журнала, на котором страница прочитала игру (GameDetail.eventSeq): что
// случилось между чтением и входом в комнату, придёт как onResync.
export function useGameRoom(
  gameId: string,
  handlers: GameRoomHandlers,
  since?: number,
) {
  const [online, setOnline] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  // Обработчики — свежие на каждый рендер, а подписка — одна на игру.
  const handlersRef = useRef(handlers);
  // Нужен только при первом входе: сама подписка от него не зависит.
  const sinceRef = useRef(since);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const socket = acquireGameSocket();
    // Последний номер журнала, о котором знает страница: по нему догоняем после обрыва.
    let lastSeq: number | undefined = sinceRef.current;
    let disposed = false;

    const joinRoom = () => {
      const request = { gameId, afterSeq: lastSeq };
      socket
        .emitWithAck(GAME_SOCKET.join, request)
        .then((ack: GameJoinAck) => {
          if (disposed) return;
          if (!ack.ok) {
            console.error('Game room join refused', gameId, ack.error);
            return;
          }
          setConnected(true);
          setOnline(ack.online);
          if (lastSeq !== undefined && ack.seq > lastSeq) {
            handlersRef.current.onResync?.(ack.missed);
          }
          lastSeq = Math.max(lastSeq ?? 0, ack.seq);
        })
        .catch((err: unknown) => {
          console.error('Game room join failed', gameId, err);
        });
    };
    const onDisconnect = () => setConnected(false);
    const onChanged = (message: GameChangedMessage) => {
      if (message.gameId !== gameId) return;
      lastSeq = Math.max(lastSeq ?? 0, message.seq);
      handlersRef.current.onChanged?.(message);
    };
    const onEvent = (message: GameEventMessage) => {
      if (message.gameId === gameId)
        handlersRef.current.onEvent?.(message.event);
    };
    const onPresence = (message: GamePresenceMessage) => {
      if (message.gameId === gameId) setOnline(message.online);
    };
    const onClosed = (message: GameClosedMessage) => {
      if (message.gameId === gameId)
        handlersRef.current.onClosed?.(message.reason);
    };
    const onSceneEdit = (message: GameSceneEditMessage) => {
      if (message.gameId === gameId) handlersRef.current.onSceneEdit?.(message);
    };

    socket.on('connect', joinRoom);
    socket.on('disconnect', onDisconnect);
    socket.on(GAME_SOCKET.changed, onChanged);
    socket.on(GAME_SOCKET.event, onEvent);
    socket.on(GAME_SOCKET.presence, onPresence);
    socket.on(GAME_SOCKET.closed, onClosed);
    socket.on(GAME_SOCKET.sceneEdit, onSceneEdit);
    if (socket.connected) joinRoom();

    return () => {
      disposed = true;
      socket.off('connect', joinRoom);
      socket.off('disconnect', onDisconnect);
      socket.off(GAME_SOCKET.changed, onChanged);
      socket.off(GAME_SOCKET.event, onEvent);
      socket.off(GAME_SOCKET.presence, onPresence);
      socket.off(GAME_SOCKET.closed, onClosed);
      socket.off(GAME_SOCKET.sceneEdit, onSceneEdit);
      if (socket.connected) socket.emit(GAME_SOCKET.leave, { gameId });
      releaseGameSocket();
    };
  }, [gameId]);

  return { online, connected };
}
