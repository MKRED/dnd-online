import { useCallback, useMemo, useState } from 'react';
import type {
  GameFigures,
  GameSceneEditMessage,
  MapObjectRefsView,
} from 'shared';
import type { SceneCreaturesView } from '../../../features/maps/MapScene';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { useKeyCodes } from '../../../features/maps/useKeyCodes';
import { useCreatureWalk } from './useCreatureWalk';
import { useSceneCreatures } from './useSceneCreatures';

interface CreatureCardsOptions {
  gameId: string;
  sceneId: string | null;
  master: boolean;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  // Фигурки персонажей мешают ходу монстра.
  figures: GameFigures | null;
  // Выбор существа щелчком на карте и его ход: у мастера — только в режиме «Игра».
  canPick: boolean;
  // Выбранная фигурка: выбор у страницы один — фигурка снимает выбор существа.
  figureId: string | null;
  // Выбрать существо — снять выбор фигурки.
  clearFigure: () => void;
  // Перечитать фигурки (их метки здоровья и Скорость).
  reloadFigures: () => void;
}

// Состояние существ на странице сцены (docs/plan/done/game.md, этап 8): монстры и НПС, выбор
// существа мастером и номер для перечитывания карточки персонажа.
export function useCreatureCards({
  gameId,
  sceneId,
  master,
  state,
  refs,
  figures,
  canPick,
  figureId,
  clearFigure,
  reloadFigures,
}: CreatureCardsOptions) {
  const creatures = useSceneCreatures(gameId, sceneId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const { reload } = creatures;

  const select = useCallback(
    (objectId: number | null) => {
      if (objectId !== null) clearFigure();
      setSelectedId(objectId);
    },
    [clearFigure],
  );
  // Выбрали фигурку — на карте и в списке остаётся выделенной только она. Сброс во время
  // отрисовки по смене фигурки, а не в эффекте: без лишнего кадра с двумя выделениями.
  const [shownFigure, setShownFigure] = useState(figureId);
  if (figureId !== shownFigure) {
    setShownFigure(figureId);
    if (figureId !== null) setSelectedId(null);
  }
  const clearSelection = useCallback(() => setSelectedId(null), []);
  // Esc снимает выбор, как у фигурок.
  useKeyCodes({ Escape: clearSelection });
  // Щелчок по существу на карте выбирает его или снимает выбор, как в списке; по уже
  // выбранному щелчок проходит к клеткам (ObjectLayer), а мимо них — снимает выбор (onMiss).
  const pick = useCallback(
    (objectId: number) => select(selectedId === objectId ? null : objectId),
    [select, selectedId],
  );

  // Событие состояния существ или фигурок: всё, что показывает здоровье, перечитывается.
  const onChanged = useCallback(() => {
    reloadFigures();
    reload();
    setVersion((v) => v + 1);
  }, [reloadFigures, reload]);

  // Мастер поставил или убрал монстра — список существ другой.
  const onSceneEdit = useCallback(
    (message: GameSceneEditMessage) => {
      if ((message.changes.objects ?? []).length > 0) reload();
    },
    [reload],
  );

  const selected =
    creatures.creatures?.creatures.find((c) => c.objectId === selectedId) ??
    null;
  const walk = useCreatureWalk({
    gameId,
    state,
    refs,
    creatures: creatures.creatures,
    figures,
    selectedId,
    active: master && canPick,
    onCreatures: creatures.apply,
    onMiss: clearSelection,
  });
  const view = useMemo<SceneCreaturesView>(
    () => ({
      health: creatures.health,
      selectedId: master ? selectedId : null,
      onPick: master && canPick ? pick : undefined,
    }),
    [creatures.health, master, selectedId, canPick, pick],
  );

  return {
    creatures,
    selected,
    select,
    version,
    onChanged,
    onSceneEdit,
    view,
    walk,
  };
}
