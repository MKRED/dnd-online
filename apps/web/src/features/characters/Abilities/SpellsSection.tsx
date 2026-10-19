import { Alert, Button, Fieldset, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import {
  longRestExpended,
  SPELL_SLOT_CIRCLES,
  type Character,
  type SpellSlots,
  type SpellSlotsExpended,
} from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import { spendSpellSlots } from '../charactersApi';
import classes from './Abilities.module.css';
import SpellSlotPips from './SpellSlotPips';

interface SpellsSectionProps {
  character: Character;
  // Есть — автор тратит ячейки на листе; нет — лист только для чтения.
  onChange?: (spellSlots: SpellSlots) => void;
}

// Блок «Заклинания» на листе (docs/plan/character-abilities.md): круги с ячейками.
// Заклинания по кругам появятся здесь же на этапе 4. Правки идут по одной: пока
// запрос в пути, кружки заняты — иначе два быстрых клика прислали бы одно и то же число.
function SpellsSection({ character, onChange }: SpellsSectionProps) {
  const { id, spellSlots } = character;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const circles = SPELL_SLOT_CIRCLES.filter(
    (level) => (spellSlots[level]?.total ?? 0) > 0,
  );
  if (circles.length === 0) return null;
  const anySpent = circles.some((level) => spellSlots[level]!.expended > 0);

  const save = async (expended: SpellSlotsExpended, failure: string) => {
    setBusy(true);
    setError(null);
    try {
      onChange?.((await spendSpellSlots(id, expended)).spellSlots);
    } catch (err: unknown) {
      console.error('Spell slot change failed', err);
      setError(errorMessage(err, failure));
    } finally {
      setBusy(false);
    }
  };

  // Кнопка — в первой строке круга, а не своей строкой. Когда тратить нечего, она
  // скрыта, но место держит (см. .longRest). Подтверждения нет: вернуть потраченные
  // можно кликами по кружкам.
  const longRest = onChange && (
    <Button
      size="compact-sm"
      variant="light"
      ml="auto"
      className={classes.longRest}
      data-hidden={!anySpent || undefined}
      aria-hidden={!anySpent || undefined}
      tabIndex={anySpent ? undefined : -1}
      disabled={busy}
      title="Вернуть все потраченные ячейки"
      onClick={() =>
        void save(longRestExpended(spellSlots), 'Не удалось вернуть ячейки')
      }
    >
      Долгий отдых
    </Button>
  );

  return (
    <Fieldset legend="Заклинания">
      <Stack gap="xs">
        {circles.map((level, i) => (
          <div key={level} className={classes.circleRow}>
            <Text size="sm" fw={600} className={classes.circleLabel}>
              {level} круг
            </Text>
            <SpellSlotPips
              level={level}
              slots={spellSlots[level]!}
              busy={busy}
              onSpend={
                onChange &&
                ((expended) =>
                  void save(
                    { [level]: expended },
                    'Не удалось сохранить ячейки',
                  ))
              }
            />
            {i === 0 && longRest}
          </div>
        ))}
        {/* Ошибка — под кругами, чтобы не сдвигать кружки. */}
        {error && (
          <Alert
            color="red"
            variant="light"
            p="xs"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        <Text size="xs" c="dimmed">
          {onChange
            ? '● — ячейка есть, ○ — потрачена. Нажмите на кружок, чтобы потратить или вернуть ячейку.'
            : '● — ячейка есть, ○ — потрачена.'}
        </Text>
      </Stack>
    </Fieldset>
  );
}

export default SpellsSection;
