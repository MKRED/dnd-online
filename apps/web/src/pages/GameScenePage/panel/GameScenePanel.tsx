import { IconAdjustmentsHorizontal, IconUsers } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { GameSceneStatus } from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { CreatureCards, type useCreatureCards } from '../creatures';
import type { useScenePlay } from '../figures';
import type { SceneFogControls } from '../fog';
import {
  creatureParticipants,
  heroParticipants,
  ParticipantsTab,
} from '../participants';
import type { useSceneOpen } from '../useSceneOpen';
import HelpButton from './HelpButton';
import ScenePanel, { type PanelTab } from './ScenePanel';
import SceneTab from './SceneTab';
import { usePanelState } from './usePanelState';

type Tab = 'participants' | 'scene';

interface GameScenePanelProps {
  gameId: string;
  gameName: string;
  // null — сцена ещё не загружена или её нет.
  scene: GameSceneStatus | null;
  state: MapViewState | null;
  master: boolean;
  editing: boolean;
  open: ReturnType<typeof useSceneOpen>;
  fog: SceneFogControls;
  play: ReturnType<typeof useScenePlay>;
  cards: ReturnType<typeof useCreatureCards>;
  // Содержимое «Правки»: свойства инструмента и «Не на сцене».
  editBody: ReactNode;
}

// Правая панель страницы сцены (docs/plan/scene-page.md, этап 2): в «Игре» — вкладки
// «Участники» и (мастеру) «Сцена», в «Правке» — свойства инструмента.
function GameScenePanel({
  gameId,
  gameName,
  scene,
  state,
  master,
  editing,
  open,
  fog,
  play,
  cards,
  editBody,
}: GameScenePanelProps) {
  const panel = usePanelState<Tab>('participants');
  const figures = play.figures.figures;
  const tool = play.tool;
  const creatures = master ? (cards.creatures.creatures?.creatures ?? []) : [];
  const figureKey = tool.figure ? `pc:${tool.figure.character.id}` : null;
  const creatureKey =
    !tool.figure && cards.selected
      ? `creature:${cards.selected.objectId}`
      : null;
  const hasSelection =
    (tool.figure?.canMove ?? false) || cards.selected?.state != null;

  const participants = (
    <ParticipantsTab
      heroes={heroParticipants(figures?.figures ?? [])}
      creatures={creatureParticipants(creatures, (id) =>
        state?.objects.byId.get(id),
      )}
      selectedKey={figureKey ?? creatureKey}
      onSelectHero={(id) => tool.select(tool.selectedId === id ? null : id)}
      onSelectCreature={(key) => {
        const id = Number(key);
        cards.select(cards.selected?.objectId === id ? null : id);
      }}
      onRound={master ? tool.round : undefined}
      busy={tool.busy}
      errors={[tool.error, cards.walk.error]}
      selected={
        hasSelection && (
          <CreatureCards
            gameId={gameId}
            master={master}
            cards={cards}
            figure={tool.figure}
            onFigureAllowance={tool.allowance}
            figureBusy={tool.busy}
          />
        )
      }
    />
  );
  const tabs: PanelTab<Tab>[] = [
    {
      value: 'participants',
      label: 'Участники',
      icon: <IconUsers size={20} />,
      content: participants,
    },
  ];
  if (master && scene) {
    tabs.push({
      value: 'scene',
      label: 'Сцена',
      icon: <IconAdjustmentsHorizontal size={20} />,
      content: (
        <SceneTab
          scene={scene}
          busy={open.busy}
          error={open.error}
          onOpenChange={open.setOpen}
          fog={fog}
        />
      ),
    });
  }

  const subtitle = editing
    ? 'Правка · игроки видят правки сразу'
    : master && scene
      ? `${gameName} · ${scene.open ? 'сцена открыта' : 'сцена закрыта'}`
      : gameName;
  return (
    <ScenePanel
      lobby={`/games/${gameId}`}
      title={scene?.name ?? 'Сцена'}
      subtitle={subtitle}
      tabs={tabs}
      body={editing ? editBody : undefined}
      tab={panel.tab}
      onTab={panel.openTab}
      collapsed={panel.collapsed}
      onCollapsed={panel.setCollapsed}
      help={<HelpButton master={master} editing={editing} />}
    />
  );
}

export default GameScenePanel;
