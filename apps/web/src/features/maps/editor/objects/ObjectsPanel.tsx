import { Button, Divider, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { summarizeObjects, type MapObjectRefsView } from 'shared';
import type { Point } from '../../cameraView';
import type { MapViewState } from '../../mapStateFromChunks';
import ObjectList from './ObjectList';
import ObjectProperties from './ObjectProperties';
import PlaceSection from './PlaceSection';
import type { ObjectTool } from './useObjectTool';

interface ObjectsPanelProps {
  tool: ObjectTool;
  state: MapViewState;
  refs: MapObjectRefsView;
  busy: boolean;
  // Перенести центр камеры в точку (к объекту из списка).
  onFocus: (point: Point) => void;
}

// Панель инструмента «Объекты»: сверху — что ставить или свойства выделенного, ниже —
// список «На карте» (docs/plan/done/map-objects.md, «Редактор: один инструмент»).
function ObjectsPanel({ tool, state, refs, busy, onFocus }: ObjectsPanelProps) {
  // «На карте» — только то, что инструмент берёт: на сцене игры у «Строить» без существ.
  const { accepts } = tool;
  const summaries = useMemo(
    () =>
      summarizeObjects(
        state,
        [...state.objects.byId.values()].filter(accepts),
        refs,
      ),
    [state, refs, accepts],
  );
  const { selected } = tool;

  const pickFromList = (id: number) => {
    const object = state.objects.byId.get(id);
    if (!object) return;
    tool.select(id);
    const [ex, , ez] = tool.extentOf(object);
    onFocus([object.at[0] + ex / 2, object.at[1], object.at[2] + ez / 2]);
  };

  return (
    <Stack gap="sm">
      {selected ? (
        <>
          {/* key: свойства другого объекта — новая панель. Иначе индикатор
              SegmentedControl вида оставался на месте прошлого объекта. */}
          <ObjectProperties
            key={selected.id}
            tool={tool}
            object={selected}
            summary={summaries.find((s) => s.id === selected.id)}
            refs={refs}
            busy={busy}
          />
          <Button size="xs" variant="subtle" onClick={tool.escape}>
            {tool.moving ? 'Отменить перенос (Esc)' : 'Снять выделение (Esc)'}
          </Button>
        </>
      ) : (
        <PlaceSection tool={tool} />
      )}
      <Divider />
      <ObjectList
        summaries={summaries}
        selectedId={selected?.id ?? null}
        onPick={pickFromList}
      />
    </Stack>
  );
}

export default ObjectsPanel;
