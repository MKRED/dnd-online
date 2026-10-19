import { SegmentedControl, Stack } from '@mantine/core';
import { useMemo, useState, type ReactNode } from 'react';
import type { Monster, MonsterEffectEntry } from 'shared';
import { EffectLinksStrip, EffectSummary } from '../../characters';
import MonsterHeader from './MonsterHeader';
import MonsterStats from './MonsterStats';
import { monsterTotals } from './monsterTotals';

interface MonsterTopProps {
  monster: Monster;
  showHidden: boolean;
  aside: ReactNode;
  // Есть — автор накладывает и снимает эффекты; нет — только чтение.
  onEffectsChange?: (effects: MonsterEffectEntry[]) => void;
}

// Шапка карточки, плашки постоянных эффектов и боевые числа — как верх листа персонажа.
// С эффектами числа — итог (КД и скорости), переключатель показывает стат-блок как его
// ввёл мастер. Не запоминается: карточка открывается итогом, как лист.
function MonsterTop({
  monster,
  showHidden,
  aside,
  onEffectsChange,
}: MonsterTopProps) {
  const [withEffects, setWithEffects] = useState(true);
  const totals = useMemo(
    () => monsterTotals(monster.statBlock, monster.effects ?? []),
    [monster.statBlock, monster.effects],
  );
  const effects = monster.effects ?? [];
  const shown = effects.length > 0 && withEffects ? totals : null;

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
      {shown && <EffectSummary totals={shown} />}
    </Stack>
  );
}

export default MonsterTop;
