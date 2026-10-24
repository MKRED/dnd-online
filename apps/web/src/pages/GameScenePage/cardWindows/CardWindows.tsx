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
import { IconBox, IconDiamond } from '@tabler/icons-react';
import type { MapObject, MapOp } from 'shared';
import {
  CharacterCardBody,
  CreatureCardBody,
  ItemCardBody,
} from './CardBodies';
import ObjectCardBody from './ObjectCardBody';
import { objectInfo } from './objectInfo';
import CardSheet from './CardSheet';
import CardWindowFrame from './CardWindowFrame';
import type { CardWindow, CardWindows as Windows } from './useCardWindows';

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

// Открытые окна карточек (docs/plan/scene-page.md, этап 4): на компьютере — окна поверх
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
    if (target.kind === 'item') {
      const ref = refs?.items[target.itemId];
      return {
        window,
        title: ref?.missing === null ? ref.name : 'Предмет',
        href: `/items/${target.itemId}`,
        subtitle: 'Предмет',
        portrait: (
          <ThemeIcon size={40} radius="xl" variant="light" color="yellow">
            <IconDiamond size={20} />
          </ThemeIcon>
        ),
        body: <ItemCardBody gameId={gameId} itemId={target.itemId} />,
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
            readOnly={!master && !figure?.canMove}
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
          onMove={(x, y) => windows.update(window.key, { x, y })}
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
