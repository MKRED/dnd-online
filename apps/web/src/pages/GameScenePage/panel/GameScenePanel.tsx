import {
  IconAdjustmentsHorizontal,
  IconNotes,
  IconUser,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useEffect, type ReactNode } from 'react';
import type { GameSceneStatus, MapObjectRefsView } from 'shared';
import type { ObjectImagePaths } from '../../../features/maps/MapScene';
import type { CardTarget } from '../cardWindows';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { CreatureCards, type useCreatureCards } from '../creatures';
import type { useScenePlay } from '../figures';
import type { SceneFogControls } from '../fog';
import { JournalTab, type JournalLive } from '../journal';
import {
  creatureParticipants,
  creaturePortrait,
  heroParticipants,
  ParticipantsTab,
  PartyTab,
  PlayerCharacterTab,
} from '../participants';
import type { useSceneOpen } from '../useSceneOpen';
import HelpButton from './HelpButton';
import ScenePanel, { type PanelTab } from './ScenePanel';
import SceneTab from './SceneTab';
import { usePanelState } from './usePanelState';

type Tab = 'participants' | 'scene' | 'journal' | 'me' | 'party';

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
  refs: MapObjectRefsView | null;
  images: ObjectImagePaths;
  // Открыть окно карточки (docs/plan/scene-page.md, этап 4).
  onOpenCard: (target: CardTarget) => void;
  // Живые записи журнала — мастеру, вкладка «Журнал» (этап 7).
  journal: JournalLive;
  // Переключатель режима в шапке — только на телефоне; иначе он на сцене.
  modeSwitch: ReactNode;
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
  refs,
  images,
  onOpenCard,
  journal,
  modeSwitch,
  editBody,
}: GameScenePanelProps) {
  const panel = usePanelState<Tab>(master ? 'participants' : 'me');
  // Открытая вкладка «Журнал» показывает всё пришедшее — число новых гаснет.
  const journalShown =
    master && !editing && !panel.collapsed && panel.tab === 'journal';
  const { markSeen } = journal;
  useEffect(() => {
    if (journalShown) markSeen();
  }, [journalShown, markSeen]);
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
      heroes={heroParticipants(figures?.figures ?? [], gameId)}
      creatures={creatureParticipants(
        creatures,
        (id) => state?.objects.byId.get(id),
        (object) => (refs ? creaturePortrait(object, refs, images) : null),
      )}
      selectedKey={figureKey ?? creatureKey}
      onSelectHero={(id) => tool.select(tool.selectedId === id ? null : id)}
      onSelectCreature={(key) => {
        const id = Number(key);
        cards.select(cards.selected?.objectId === id ? null : id);
      }}
      onOpenHero={(id) => onOpenCard({ kind: 'character', id })}
      onOpenCreature={(key) =>
        onOpenCard({ kind: 'creature', objectId: Number(key) })
      }
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
            onOpenCard={onOpenCard}
          />
        )
      }
    />
  );
  // Игрок (docs/plan/scene-page.md, этап 5, вариант А): «Персонаж» — свои, кого он водит,
  // «Отряд» — другие герои, только чтение. НПС и врагов у игрока в панели нет.
  const heroes = figures?.figures ?? [];
  const tabs: PanelTab<Tab>[] = master
    ? [
        {
          value: 'participants',
          label: 'Участники',
          icon: <IconUsers size={20} />,
          content: participants,
        },
      ]
    : [
        {
          value: 'me',
          label: 'Персонаж',
          icon: <IconUser size={20} />,
          content: (
            <PlayerCharacterTab
              gameId={gameId}
              own={heroes.filter((f) => f.canMove)}
              version={cards.version}
              tool={tool}
              onOpenCard={onOpenCard}
            />
          ),
        },
        {
          value: 'party',
          label: 'Отряд',
          icon: <IconUsersGroup size={20} />,
          content: (
            <PartyTab
              party={heroParticipants(
                heroes.filter((f) => !f.canMove),
                gameId,
              )}
              onOpenCard={onOpenCard}
            />
          ),
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
  if (master) {
    tabs.push({
      value: 'journal',
      label: 'Журнал',
      icon: <IconNotes size={20} />,
      badge: journal.unread,
      content: <JournalTab gameId={gameId} journal={journal} />,
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
      headerExtra={modeSwitch}
    />
  );
}

export default GameScenePanel;
