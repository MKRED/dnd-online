import { useCallback, useMemo, useState } from 'react';
import type { GameSceneEditMessage } from 'shared';
import type { SceneCreaturesView } from '../../../features/maps/MapScene';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import type { SheetTarget } from './FullSheetDrawer';
import { useSceneCreatures } from './useSceneCreatures';

interface CreatureCardsOptions {
  gameId: string;
  sceneId: string | null;
  master: boolean;
  state: MapViewState | null;
  // Выбор существа щелчком на карте: у мастера — только в «Просмотре».
  canPick: boolean;
  // Выбрать существо — снять выбор фигурки.
  clearFigure: () => void;
  // Перечитать фигурки (их метки здоровья и Скорость).
  reloadFigures: () => void;
}

// Состояние существ на странице сцены (docs/plan/done/game.md, этап 8): монстры и НПС, выбор
// существа мастером, номер для перечитывания карточки персонажа и открытый полный лист.
export function useCreatureCards({
  gameId,
  sceneId,
  master,
  state,
  canPick,
  clearFigure,
  reloadFigures,
}: CreatureCardsOptions) {
  const creatures = useSceneCreatures(gameId, sceneId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const { reload } = creatures;

  const select = useCallback(
    (objectId: number | null) => {
      if (objectId !== null) clearFigure();
      setSelectedId(objectId);
    },
    [clearFigure],
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

  // Полный лист монстра или НПС — по ссылке объекта на копию в библиотеке.
  const openCreatureSheet = (objectId: number) => {
    const object = state?.objects.byId.get(objectId);
    if (object?.kind === 'monster') {
      setSheet({ kind: 'monster', sourceId: object.monsterId });
    } else if (object?.kind === 'npc') {
      setSheet({ kind: 'npc', sourceId: object.characterId });
    }
  };

  const selected =
    creatures.creatures?.creatures.find((c) => c.objectId === selectedId) ??
    null;
  const view = useMemo<SceneCreaturesView>(
    () => ({
      health: creatures.health,
      selectedId: master ? selectedId : null,
      onPick: master && canPick ? select : undefined,
    }),
    [creatures.health, master, selectedId, canPick, select],
  );

  return {
    creatures,
    selected,
    select,
    version,
    sheet,
    setSheet,
    openCreatureSheet,
    onChanged,
    onSceneEdit,
    view,
  };
}
