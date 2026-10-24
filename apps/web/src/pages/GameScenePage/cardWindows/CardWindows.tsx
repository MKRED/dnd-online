import { useMediaQuery } from '@mantine/hooks';
import type { ReactNode } from 'react';
import type { GameFigures, MapObjectRefsView } from 'shared';
import { figureImagePath } from '../../../features/games';
import type { ObjectImagePaths } from '../../../features/maps/MapScene';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import type { useCreatureCards } from '../creatures';
import type { FigureTool } from '../figures';
import { creaturePortrait, Portrait } from '../participants';
import { CharacterCardBody, CreatureCardBody } from './CardBodies';
import CardSheet from './CardSheet';
import CardWindowFrame from './CardWindowFrame';
import type { CardWindow, CardWindows as Windows } from './useCardWindows';

interface CardWindowsProps {
  gameId: string;
  master: boolean;
  windows: Windows;
  figures: GameFigures | null;
  figureTool: FigureTool;
  cards: ReturnType<typeof useCreatureCards>;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  images: ObjectImagePaths;
}

export interface CardView {
  window: CardWindow;
  title: string;
  subtitle: string;
  portrait: ReactNode;
  body: ReactNode;
}

// Открытые окна карточек (docs/plan/scene-page.md, этап 4): на компьютере — окна поверх
// сцены, на телефоне — лист снизу с чипами открытых.
function CardWindows({
  gameId,
  master,
  windows,
  figures,
  figureTool,
  cards,
  state,
  refs,
  images,
}: CardWindowsProps) {
  const narrow = useMediaQuery('(max-width: 48em)');
  const views: CardView[] = windows.windows.map((window) => {
    const { target } = window;
    if (target.kind === 'character') {
      const figure =
        figures?.figures.find((f) => f.character.id === target.id) ?? null;
      const name = figure?.character.name ?? 'Персонаж';
      return {
        window,
        title: name,
        subtitle: 'Герой',
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
      {views.map(({ window, title, subtitle, portrait, body }, index) => (
        <CardWindowFrame
          key={window.key}
          title={title}
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
