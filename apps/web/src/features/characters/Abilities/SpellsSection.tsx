import { Alert, Button, Fieldset, Stack, Text } from '@mantine/core';
import {
  canBePrepared,
  formatSpellLevel,
  longRestExpended,
  SPELL_SLOT_CIRCLES,
  type CharacterAbilityEntry,
  type SpellSlotCircle,
  type SpellSlots,
} from 'shared';
import { GroupEntries } from '../../abilityLinks';
import classes from './Abilities.module.css';
import { spellCircles } from './abilitiesView';
import SpellSlotPips from './SpellSlotPips';
import { useAbilitiesEditor } from './useAbilitiesEditor';
import { useSpellSlotsEditor } from './useSpellSlotsEditor';

interface SpellsSectionProps {
  characterId: string;
  abilities: CharacterAbilityEntry[];
  spellSlots: SpellSlots;
  // Есть — автор тратит ячейки на листе; нет — только чтение.
  onSlotsChange?: (spellSlots: SpellSlots) => void;
  // Есть — автор отмечает подготовку и убирает заклинания.
  onAbilitiesChange?: (abilities: CharacterAbilityEntry[]) => void;
}

// Блок «Заклинания» (docs/plan/done/character-abilities.md): заговоры, затем круги 1–9. Ячейки
// стоят в заголовке круга, рядом с тем, на что они тратятся. Добавляют заклинания
// кнопкой «+ Способность» в «Умениях».
function SpellsSection({
  characterId,
  abilities,
  spellSlots,
  onSlotsChange,
  onAbilitiesChange,
}: SpellsSectionProps) {
  const slots = useSpellSlotsEditor(characterId, onSlotsChange);
  const { editor: rows, renderRow } = useAbilitiesEditor(
    characterId,
    onAbilitiesChange,
  );

  const circles = spellCircles(abilities, spellSlots);
  if (circles.length === 0) return null;
  const withSlots = SPELL_SLOT_CIRCLES.filter(
    (level) => (spellSlots[level]?.total ?? 0) > 0,
  );
  const anySpent = withSlots.some((level) => spellSlots[level]!.expended > 0);
  const anyPreparable = circles.some(({ entries }) =>
    entries.some((e) => canBePrepared(e.ability)),
  );
  const error = slots.error ?? rows.error;
  const legend = [
    withSlots.length > 0 && '● ○ у круга — ячейки: есть и потрачена.',
    anyPreparable && '● у заклинания — подготовлено.',
    onSlotsChange &&
      withSlots.length > 0 &&
      'Нажмите на кружок, чтобы потратить или вернуть ячейку.',
  ]
    .filter(Boolean)
    .join(' ');

  // Кнопка — в строке первого круга с ячейками, а не своей строкой. Когда тратить
  // нечего, она скрыта, но место держит (см. .longRest): появляясь после первой траты,
  // она иначе сдвигала бы кружки под курсором. Подтверждения нет: вернуть можно кликами.
  const longRest = onSlotsChange && withSlots.length > 0 && (
    <Button
      size="compact-sm"
      variant="light"
      ml="auto"
      className={classes.longRest}
      data-hidden={!anySpent || undefined}
      aria-hidden={!anySpent || undefined}
      tabIndex={anySpent ? undefined : -1}
      disabled={slots.busy}
      title="Вернуть все потраченные ячейки"
      onClick={() =>
        void slots.save(
          longRestExpended(spellSlots),
          'Не удалось вернуть ячейки',
        )
      }
    >
      Долгий отдых
    </Button>
  );

  return (
    <Fieldset legend="Заклинания">
      <Stack gap="xs">
        {circles.map(({ level, entries }) => {
          const circleSlots = spellSlots[level as SpellSlotCircle];
          return (
            <div key={level}>
              <div className={classes.circleRow}>
                <Text size="sm" fw={600} className={classes.circleLabel}>
                  {level === 0 ? 'Заговоры' : formatSpellLevel(level)}
                </Text>
                {circleSlots && circleSlots.total > 0 && (
                  <SpellSlotPips
                    level={level as SpellSlotCircle}
                    slots={circleSlots}
                    busy={slots.busy}
                    onSpend={
                      onSlotsChange &&
                      ((expended) =>
                        void slots.save(
                          { [level]: expended },
                          'Не удалось сохранить ячейки',
                        ))
                    }
                  />
                )}
                {level === withSlots[0] && longRest}
              </div>
              {entries.length > 0 && (
                <GroupEntries>{entries.map(renderRow)}</GroupEntries>
              )}
            </div>
          );
        })}
        {/* Ошибка — под кругами, чтобы не сдвигать кружки и строки. */}
        {error && (
          <Alert
            color="red"
            variant="light"
            p="xs"
            withCloseButton
            onClose={() => {
              slots.setError(null);
              rows.setError(null);
            }}
          >
            {error}
          </Alert>
        )}
        {legend && (
          <Text size="xs" c="dimmed">
            {legend}
          </Text>
        )}
      </Stack>
    </Fieldset>
  );
}

export default SpellsSection;
