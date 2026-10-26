import { Badge, Fieldset, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useMemo } from 'react';
import { gearAttacks, wornGear, type Character } from 'shared';
import { attackView, type AttackView } from './attackView';
import classes from './SheetAttacks.module.css';

// Блок «Атаки» под боевыми плитками (docs/plan/equipment.md, этап 3, вариант А): строка на
// каждое оружие в руках куклы, вписывать ничего не надо. Атаки заклинаниями и чертами —
// в способностях листа. Без оружия в руках блока нет.
function SheetAttacks({ character }: { character: Character }) {
  const rows = useMemo(() => {
    const attacks = gearAttacks(wornGear(character.inventory), {
      abilityScores: character.abilityScores,
      proficiencyBonus: character.proficiencyBonus,
      weapons: character.proficiencies.weapons,
    });
    return attacks.map((a) => attackView(a, character.weaponMasteries));
  }, [character]);
  if (rows.length === 0) return null;
  return (
    <Fieldset legend="Атаки">
      <Stack gap={0} className={classes.list}>
        {rows.map((row) => (
          <AttackRow key={row.key} row={row} />
        ))}
      </Stack>
    </Fieldset>
  );
}

function AttackRow({ row }: { row: AttackView }) {
  return (
    <div className={classes.row}>
      <div className={classes.weapon}>
        <Text size="sm" fw={600}>
          {row.name}
        </Text>
        <Text size="xs" c="dimmed">
          {row.place}
        </Text>
        {(row.chips.length > 0 || row.mastery) && (
          <Group gap={4} mt={2}>
            {row.chips.map((chip) => (
              <Badge key={chip} size="xs" variant="light" color="gray">
                {chip}
              </Badge>
            ))}
            {row.mastery && (
              <Badge size="xs" variant="light" color="grape">
                {row.mastery}
              </Badge>
            )}
          </Group>
        )}
        {row.notes.map((note) => (
          <Text key={note} size="xs" c="orange">
            {note}
          </Text>
        ))}
      </div>
      {/* На телефоне наведения нет — подсказка открывается и касанием. */}
      <Tooltip
        label={row.bonusParts}
        withArrow
        events={{ hover: true, focus: true, touch: true }}
      >
        <Text
          fw={700}
          className={classes.bonus}
          tabIndex={0}
          aria-label={`Атака ${row.bonus}: ${row.bonusParts}`}
        >
          {row.bonus}
        </Text>
      </Tooltip>
      <div className={classes.damage}>
        <Text size="sm">{row.damage}</Text>
        {row.damageNotes.map((note) => (
          <Text key={note} size="xs" c="dimmed">
            {note}
          </Text>
        ))}
      </div>
    </div>
  );
}

export default SheetAttacks;
