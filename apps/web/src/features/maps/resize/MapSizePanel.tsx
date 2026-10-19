import {
  Alert,
  Button,
  Group,
  NumberInput,
  Radio,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { useMemo } from 'react';
import {
  DEFAULT_MAP_LIMITS,
  type ResizeCut,
  type ResizeOp,
  type ResizeSide,
  type SizedMapState,
} from 'shared';
import { mapSizeLabel } from '../mapSizeLabel';
import { checkDraft, draftOp, type ResizeDraft } from './resizeDraft';

interface MapSizePanelProps {
  state: SizedMapState;
  draft: ResizeDraft;
  onChange: (draft: ResizeDraft) => void;
  onApply: (op: ResizeOp) => void;
  onCancel: () => void;
  busy: boolean;
}

const SIDE_LABELS: Record<ResizeSide, string> = {
  north: 'Север',
  south: 'Юг',
  west: 'Запад',
  east: 'Восток',
  down: 'Снизу',
};

// «Скрыть» первым: оно же по умолчанию и ничего не теряет.
const CUT_LABELS: Record<ResizeCut, string> = {
  keep: 'Скрыть — вернутся, если снова расширить карту',
  delete: 'Удалить',
};

// Стороны света — по их местам на сетке 3 × 3, как на карте (север сверху).
// prettier-ignore
const COMPASS: (ResizeSide | null)[] = [
  null, 'north', null,
  'west', null, 'east',
  null, 'south', null,
];

// Панель «Размер карты» вместо инструментов: сцена рядом показывает новую границу,
// пока не нажато «Применить» (docs/plan/done/map-editor.md, «Размер карты»).
function MapSizePanel({
  state,
  draft,
  onChange,
  onApply,
  onCancel,
  busy,
}: MapSizePanelProps) {
  const check = useMemo(
    () => checkDraft(state, draft, DEFAULT_MAP_LIMITS),
    [state, draft],
  );

  const sideInput = (side: ResizeSide) => (
    <NumberInput
      key={side}
      label={SIDE_LABELS[side]}
      size="xs"
      allowDecimal={false}
      value={draft.grow[side]}
      onChange={(value) =>
        onChange({
          ...draft,
          grow: { ...draft.grow, [side]: Number(value) || 0 },
        })
      }
    />
  );

  return (
    <Stack gap="sm">
      <Text size="sm">Сейчас {mapSizeLabel(state.size)}.</Text>
      <Text size="xs" c="dimmed">
        Сколько клеток добавить с каждой стороны; число меньше нуля убирает.
        Запад, север и низ сдвигают всю карту: новые уровни снизу — место для
        подвала.
      </Text>

      <SimpleGrid cols={3} spacing={6} verticalSpacing={4}>
        {COMPASS.map((side, index) =>
          side ? sideInput(side) : <div key={index} />,
        )}
      </SimpleGrid>
      {sideInput('down')}

      <Text size="sm" fw={600}>
        Станет {mapSizeLabel(check.after)}
      </Text>

      {check.outside > 0 && (
        <Radio.Group
          label={`За восточной и южной границей окажется блоков: ${check.outside}`}
          value={draft.cut}
          onChange={(value) => onChange({ ...draft, cut: value })}
        >
          <Stack gap={6} mt={6}>
            {(['keep', 'delete'] as const).map((cut) => (
              <Radio key={cut} value={cut} label={CUT_LABELS[cut]} size="xs" />
            ))}
          </Stack>
        </Radio.Group>
      )}

      {check.error ? (
        <Alert color="red">{check.error}</Alert>
      ) : (
        check.removed > 0 && (
          <Alert color="yellow">
            Удалится блоков: {check.removed}. Вернуть их можно отменой (Ctrl+Z).
          </Alert>
        )
      )}

      <Group gap="xs" grow>
        <Button
          size="xs"
          loading={busy}
          disabled={check.unchanged || check.error !== null}
          onClick={() => onApply(draftOp(draft, check.outside))}
        >
          Применить
        </Button>
        <Button size="xs" variant="default" onClick={onCancel}>
          Отмена
        </Button>
      </Group>
    </Stack>
  );
}

export default MapSizePanel;
