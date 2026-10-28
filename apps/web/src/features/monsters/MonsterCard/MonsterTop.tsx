import { SegmentedControl, Stack } from '@mantine/core';
import { useMemo, useState, type ReactNode } from 'react';
import {
  monsterTotals,
  type Monster,
  type MonsterEffectEntry,
} from 'shared';
import { EffectLinksStrip, EffectSummary } from '../../characters';
import MonsterHeader from './MonsterHeader';
import MonsterStats from './MonsterStats';

interface MonsterTopProps {
  monster: Monster;
  showHidden: boolean;
  aside: ReactNode;
  // Есть — автор накладывает и снимает эффекты; нет — только чтение.
  onEffectsChange?: (effects: MonsterEffectEntry[]) => void;
}

// Шапка карточки, плашки постоянных эффектов и боевые числа — как верх листа персонажа.
// С эффектами числа — итог (КД и скорости), переключатель показывает стат-блок как его
// ввёл мастер, с чертами: они часть монстра (docs/plan/done/traits.md). Не запоминается:
// карточка открывается итогом, как лист.
function MonsterTop({
  monster,
  showHidden,
  aside,
  onEffectsChange,
}: MonsterTopProps) {
  const [withEffects, setWithEffects] = useState(true);
  const { statBlock } = monster;
  const totals = useMemo(
    () =>
      monsterTotals(statBlock, monster.effects ?? [], monster.abilities ?? []),
    [statBlock, monster.effects, monster.abilities],
  );
  const base = useMemo(
    () => monsterTotals(statBlock, [], monster.abilities ?? []),
    [statBlock, monster.abilities],
  );
  const effects = monster.effects ?? [];
  const shown = effects.length > 0 && !withEffects ? base : totals;

  return (
    <Stack gap="md">
      <MonsterHeader monster={monster} showHidden={showHidden} aside={aside} />
      <EffectLinksStrip
        effects={effects}
        apiBase={`/monsters/${monster.id}/effects`}
        owner="monster"
        onChange={onEffectsChange}
      />
      {effects.length > 0 && (
        <SegmentedControl
          aria-label="Вид карточки"
          size="xs"
          value={withEffects ? 'with' : 'base'}
          onChange={(value) => setWithEffects(value === 'with')}
          data={[
            { value: 'with', label: 'С эффектами' },
            { value: 'base', label: 'Без эффектов' },
          ]}
        />
      )}
      <MonsterStats block={monster.statBlock} totals={shown} />
      <EffectSummary totals={shown} />
    </Stack>
  );
}

export default MonsterTop;
