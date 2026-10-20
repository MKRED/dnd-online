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
// список «На карте» (docs/plan/map-objects.md, «Редактор: один инструмент»).
function ObjectsPanel({ tool, state, refs, busy, onFocus }: ObjectsPanelProps) {
  const summaries = useMemo(
    () => summarizeObjects(state, state.objects.byId.values(), refs),
    [state, refs],
  );
  const { selected } = tool;

  const pickFromList = (id: number) => {
    const object = state.objects.byId.get(id);
    if (!object) return;
    tool.select(id);
    const half = tool.spanOf(object) / 2;
    onFocus([object.at[0] + half, object.at[1], object.at[2] + half]);
  };

  return (
    <Stack gap="sm">
      {selected ? (
        <>
          <ObjectProperties
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
