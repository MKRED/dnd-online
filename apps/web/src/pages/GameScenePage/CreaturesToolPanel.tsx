import { Button, Stack, Text } from '@mantine/core';
import type { GameFigures, MapObjectRefsView } from 'shared';
import type { Point } from '../../features/maps/cameraView';
import {
  CreatureChoicePanel,
  ObjectsPanel,
  type MapEditor,
  type ObjectTool,
} from '../../features/maps/editor';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import UnplacedList from './figures/UnplacedList';
import type { FigureTool } from './figures';

interface CreaturesToolPanelProps {
  editor: MapEditor;
  creatures: ObjectTool;
  // Герои: «Не на сцене» и выбранная фигурка.
  figures: GameFigures | null;
  figureTool: FigureTool;
  state: MapViewState;
  refs: MapObjectRefsView;
  busy: boolean;
  onFocus: (point: Point) => void;
}

// Панель инструмента «Существа» (замечания после первой партии, 2026-10-26): герои без
// фигуры, выбранный герой или существо, «Поставить существо» и список существ на сцене.
// Существо ставится по одному: после щелчка выбор «что ставить» снимается.
function CreaturesToolPanel({
  editor,
  creatures,
  figures,
  figureTool,
  state,
  refs,
  busy,
  onFocus,
}: CreaturesToolPanelProps) {
  const heroName =
    figureTool.figure?.character.name ?? figureTool.placing?.name ?? null;
  return (
    <Stack gap="md">
      {figures && (
        <UnplacedList unplaced={figures.unplaced} tool={figureTool} />
      )}
      {heroName ? (
        <Stack gap={4}>
          <Text fw={600}>{heroName}</Text>
          <Text size="sm" c="dimmed">
            {figureTool.figure
              ? 'Щелчок по клетке или перетаскивание — переставить, без хода и запаса.'
              : 'Щелчок по клетке — поставить на сцену.'}
          </Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => figureTool.select(null)}
          >
            Снять выбор (Esc)
          </Button>
        </Stack>
      ) : (
        <>
          {!creatures.selected && (
            <CreatureChoicePanel
              choice={creatures.settings.choice}
              recent={editor.creatureRecent}
              opened={editor.pickerOpen}
              onOpen={() => editor.setPickerOpen(true)}
              onClose={() => editor.setPickerOpen(false)}
              onPick={editor.pickCreature}
              onSelectRecent={editor.selectCreatureRecent}
              onClear={() => creatures.choose(null)}
            />
          )}
          <ObjectsPanel
            tool={creatures}
            state={state}
            refs={refs}
            busy={busy}
            onFocus={onFocus}
          />
        </>
      )}
    </Stack>
  );
}

export default CreaturesToolPanel;
