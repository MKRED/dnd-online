import { Alert, NumberInput, Stack, Switch, Text } from '@mantine/core';
import { useState } from 'react';
import { SIGHT_RANGE_MAX, SIGHT_RANGE_STEP } from 'shared';
import FogOffConfirm from './FogOffConfirm';
import type { SceneFogControls } from './useSceneFog';

// Дальность — по клетке (5 футов) и не больше предела замера (docs/plan/done/fog-of-war.md).
function roundRange(value: number): number {
  const stepped = Math.round(value / SIGHT_RANGE_STEP) * SIGHT_RANGE_STEP;
  return Math.min(SIGHT_RANGE_MAX, Math.max(SIGHT_RANGE_STEP, stepped));
}

// Группа «Туман войны» во вкладке «Сцена» (docs/plan/done/fog-of-war.md, этап 6): включить
// туман и дальность обзора. Выключить — только после предупреждения (замечания после первой
// партии, 2026-10-26): выключенный туман сразу открывает игрокам всю сцену.
function FogPanel({ fog }: { fog: SceneFogControls }) {
  const [asking, setAsking] = useState(false);
  // Набираемая дальность: сохраняется по Enter и при уходе из поля, не на каждую цифру.
  const [draft, setDraft] = useState<number | string>(fog.sightRange);
  const [shown, setShown] = useState(fog.sightRange);
  if (shown !== fog.sightRange) {
    setShown(fog.sightRange);
    setDraft(fog.sightRange);
  }

  const commit = () => {
    const value = roundRange(Number(draft) || fog.sightRange);
    setDraft(value);
    if (value !== fog.sightRange) {
      fog.save({ enabled: fog.fogOn, sightRange: value });
    }
  };

  return (
    <Stack gap="xs">
      <Stack gap={4}>
        <Switch
          label="Туман войны"
          checked={fog.fogOn}
          disabled={fog.busy}
          onChange={(e) => {
            if (e.currentTarget.checked) {
              setAsking(false);
              fog.save({ enabled: true, sightRange: fog.sightRange });
            } else {
              setAsking(true);
            }
          }}
        />
        <Text size="xs" c="dimmed">
          {fog.fogOn
            ? 'Игроки видят то, что видят их персонажи. Где не были — пусто, где были и ушли — серое, без существ.'
            : 'Игроки видят всю сцену.'}
        </Text>
      </Stack>
      {asking && fog.fogOn && (
        <FogOffConfirm
          onConfirm={() => {
            setAsking(false);
            fog.save({ enabled: false, sightRange: fog.sightRange });
          }}
          onCancel={() => setAsking(false)}
        />
      )}
      {fog.fogOn && (
        <NumberInput
          label="Дальность обзора, фт"
          description="Одна на сцену, пока на карте нет света"
          value={draft}
          onChange={setDraft}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          min={SIGHT_RANGE_STEP}
          max={SIGHT_RANGE_MAX}
          step={SIGHT_RANGE_STEP}
          allowDecimal={false}
          disabled={fog.busy}
          size="xs"
        />
      )}
      {fog.error && <Alert color="red">{fog.error}</Alert>}
    </Stack>
  );
}

export default FogPanel;
