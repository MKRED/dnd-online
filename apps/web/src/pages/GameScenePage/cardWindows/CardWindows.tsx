import { useMediaQuery } from '@mantine/hooks';
import type { ReactNode } from 'react';
import type { GameFigures, MapObjectRefsView } from 'shared';
import { figureImagePath } from '../../../features/games';
import type { ObjectImagePaths } from '../../../features/maps/MapScene';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import type { useCreatureCards } from '../creatures';
import type { FigureTool } from '../figures';
import { creaturePortrait, Portrait } from '../participants';
import { ThemeIcon } from '@mantine/core';
import {
  IconBox,
  IconDiamond,
  IconFlame,
  IconSparkles,
} from '@tabler/icons-react';
import { RECORD_PATHS, type RecordKind } from '../../../features/catalog';
import type { MapObject, MapOp } from 'shared';
import { CharacterCardBody, CreatureCardBody } from './CardBodies';
import RecordCardBody from './RecordCardBody';
import ObjectCardBody from './ObjectCardBody';
import { objectInfo } from './objectInfo';
import CardSheet from './CardSheet';
import CardWindowFrame from './CardWindowFrame';
import { saveCardHeight } from './cardHeight';
import type { CardWindow, CardWindows as Windows } from './useCardWindows';
import { useWatchOnly } from '../combat/MoveModeContext';

interface CardWindowsProps {
  gameId: string;
  // Кто смотрит: ссылку на лист героя получает только его владелец (чужой лист закрыт).
  userId: string | null;
  master: boolean;
  windows: Windows;
  figures: GameFigures | null;
  figureTool: FigureTool;
  cards: ReturnType<typeof useCreatureCards>;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  images: ObjectImagePaths;
  // Правки сцены мастера: дверь и замок из окна объекта (этап 6).
  applyOps: (ops: MapOp[]) => void;
  busy: boolean;
}

const RECORD_WORDS: Record<RecordKind, string> = {
  ability: 'Способность',
  effect: 'Эффект',
  item: 'Предмет',
};
const RECORD_ICONS = {
  ability: IconSparkles,
  effect: IconFlame,
  item: IconDiamond,
};

// Монстр — его карточка в каталоге, НПС — его лист; копия в библиотеке игры названа по ним.
function creatureHref(object: MapObject | undefined): string | null {
  if (object?.kind === 'monster') return `/monsters/${object.monsterId}`;
  if (object?.kind === 'npc') return `/characters/${object.characterId}`;
  return null;
}

export interface CardView {
  window: CardWindow;
  title: string;
  // Полная страница в новой вкладке; null — ссылки нет.
  href: string | null;
  subtitle: string;
  portrait: ReactNode;
  body: ReactNode;
}

// Открытые окна карточек (docs/plan/done/scene-page.md, этап 4): на компьютере — окна поверх
// сцены, на телефоне — лист снизу с чипами открытых.
function CardWindows({
  gameId,
  userId,
  master,
  windows,
  figures,
  figureTool,
  cards,
  state,
  refs,
  images,
  applyOps,
  busy,
}: CardWindowsProps) {
  const narrow = useMediaQuery('(max-width: 48em)');
  // Вне встречи игрок только смотрит: и своя карточка — без правок.
  const watchOnly = useWatchOnly();
  const views: CardView[] = windows.windows.map((window) => {
    const { target } = window;
    if (target.kind === 'object') {
      const object = state?.objects.byId.get(target.objectId);
      const info = object && refs ? objectInfo(object, refs, images) : null;
      return {
        window,
        title: info?.title ?? 'Объект',
        href: null,
        subtitle: info?.subtitle ?? '',
        portrait: (
          <ThemeIcon size={40} radius="xl" variant="light" color="yellow">
            <IconBox size={20} />
          </ThemeIcon>
        ),
        body: (
          <ObjectCardBody
            objectId={target.objectId}
            info={info}
            applyOps={applyOps}
            busy={busy}
            onOpenCard={windows.open}
          />
        ),
      };
    }
    if (
      target.kind === 'item' ||
      target.kind === 'ability' ||
      target.kind === 'effect'
    ) {
      const kind = target.kind;
      const id = target.kind === 'item' ? target.itemId : target.id;
      const ref = kind === 'item' ? refs?.items[id] : undefined;
      const Icon = RECORD_ICONS[kind];
      return {
        window,
        title:
          target.name ??
          (ref?.missing === null ? ref.name : RECORD_WORDS[kind]),
        href: `${RECORD_PATHS[kind]}/${id}`,
        subtitle: RECORD_WORDS[kind],
        portrait: (
          <ThemeIcon size={40} radius="xl" variant="light" color="yellow">
            <Icon size={20} />
          </ThemeIcon>
        ),
        body: (
          <RecordCardBody gameId={gameId} master={master} kind={kind} id={id} />
        ),
      };
    }
    if (target.kind === 'character') {
      const figure =
        figures?.figures.find((f) => f.character.id === target.id) ?? null;
      const name = figure?.character.name ?? 'Персонаж';
      return {
        window,
        title: name,
        href:
          figure && figure.ownerId === userId
            ? `/characters/${target.id}`
            : null,
        subtitle:
          !master && !figure?.canMove ? 'Отряд · только чтение' : 'Герой',
        portrait: (
          <Portrait
            image={figure ? figureImagePath(gameId, figure) : null}
            name={name}
            kind="pc"
            size={40}
          />
        ),
        body: (
          <CharacterCardBody
            gameId={gameId}
            characterId={target.id}
            version={cards.version}
            figure={figure?.canMove ? figure : null}
            onAllowance={
              master
                ? (change) => figureTool.allowance(target.id, change)
                : undefined
            }
            busy={figureTool.busy}
            readOnly={!master && (!figure?.canMove || watchOnly)}
          />
        ),
      };
    }
    const creature =
      cards.creatures.creatures?.creatures.find(
        (c) => c.objectId === target.objectId,
      ) ?? null;
    const object = state?.objects.byId.get(target.objectId);
    const name = creature?.state?.name ?? 'Существо';
    const kind = object?.kind === 'npc' ? 'npc' : 'monster';
    return {
      window,
      title: name,
      href: creatureHref(object),
      subtitle: `${kind === 'npc' ? 'НПС' : 'Монстр'}${object?.hidden ? ' · скрыт от игроков' : ''}`,
      portrait: (
        <Portrait
          image={refs ? creaturePortrait(object, refs, images) : null}
          name={name}
          kind={kind}
          size={40}
        />
      ),
      body: (
        <CreatureCardBody
          gameId={gameId}
          creature={creature}
          object={object}
          cards={cards}
        />
      ),
    };
  });

  if (narrow) return <CardSheet views={views} windows={windows} />;
  return (
    <>
      {views.map(({ window, title, href, subtitle, portrait, body }, index) => (
        <CardWindowFrame
          key={window.key}
          title={title}
          href={href}
          subtitle={subtitle}
          portrait={portrait}
          x={window.x}
          y={window.y}
          z={index}
          minimized={window.minimized}
          height={window.height}
          onMove={(x, y) => windows.update(window.key, { x, y })}
          onResize={(height, done) => {
            windows.update(window.key, { height });
            if (done) saveCardHeight(height);
          }}
          onFit={() => {
            windows.update(window.key, { height: 'fit' });
            saveCardHeight(null);
          }}
          onMinimize={(minimized) => windows.update(window.key, { minimized })}
          onClose={() => windows.close(window.key)}
          onRaise={() => windows.raise(window.key)}
        >
          {body}
        </CardWindowFrame>
      ))}
    </>
  );
}

export default CardWindows;
