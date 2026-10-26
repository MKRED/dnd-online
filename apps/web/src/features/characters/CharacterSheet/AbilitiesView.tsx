import { Fieldset, Group, Paper, Stack, Text } from '@mantine/core';
import { ABILITY_SCORES, type AbilityScore, type Character } from 'shared';
import {
  formatModifier,
  getAbilityModifier,
  getSavingThrowBonus,
  getSkillBonus,
} from '../CharacterForm/AbilityScoresSection/abilityMath';
import { ABILITY_LABELS, SKILL_LABELS } from '../characterLabels';
import { SKILLS_BY_ABILITY } from '../skillsByAbility';
import classes from './CharacterSheet.module.css';

interface BonusRowProps {
  label: string;
  bonus: number;
  // Отметка владения: «●» — владение, «●●» — экспертиза.
  mark: 0 | 1 | 2;
}

function BonusRow({ label, bonus, mark }: BonusRowProps) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm" fw={mark ? 600 : 400} c={mark ? undefined : 'dimmed'}>
        {label}
        {mark > 0 && (
          <Text
            span
            c="var(--mantine-primary-color-filled)"
            ml={6}
            aria-label={mark === 2 ? 'экспертиза' : 'владение'}
          >
            {'●'.repeat(mark)}
          </Text>
        )}
      </Text>
      <Text size="sm" fw={600}>
        {formatModifier(bonus)}
      </Text>
    </Group>
  );
}

function AbilityBlock({
  character,
  ability,
}: {
  character: Character;
  ability: AbilityScore;
}) {
  const score = character.abilityScores[ability];
  const { proficiencyBonus } = character;
  const saveProficient = character.savingThrowProficiencies.includes(ability);
  return (
    <Paper withBorder radius="md" p="sm" className={classes.ability}>
      <Group justify="space-between" align="baseline" mb={6}>
        <Text fw={600}>{ABILITY_LABELS[ability]}</Text>
        <Text>
          <Text span fw={700} className={classes.statValue}>
            {formatModifier(getAbilityModifier(score))}
          </Text>{' '}
          <Text span size="sm" c="dimmed">
            ({score})
          </Text>
        </Text>
      </Group>
      <Stack gap={2}>
        <BonusRow
          label="Спасбросок"
          bonus={getSavingThrowBonus(score, saveProficient, proficiencyBonus)}
          mark={saveProficient ? 1 : 0}
        />
        {SKILLS_BY_ABILITY[ability].map((skill) => {
          const entry = character.skillProficiencies.find(
            (proficiency) => proficiency.skill === skill,
          );
          return (
            <BonusRow
              key={skill}
              label={SKILL_LABELS[skill]}
              bonus={getSkillBonus(
                score,
                Boolean(entry),
                Boolean(entry?.expertise),
                proficiencyBonus,
              )}
              mark={!entry ? 0 : entry.expertise ? 2 : 1}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}

// Характеристики, спасброски и навыки с уже посчитанными бонусами — те же формулы, что в форме.
function AbilitiesView({ character }: { character: Character }) {
  return (
    <Fieldset legend="Характеристики и навыки">
      <div className={classes.abilitiesBox}>
        <div className={classes.abilities}>
          {ABILITY_SCORES.map((ability) => (
            <AbilityBlock
              key={ability}
              character={character}
              ability={ability}
            />
          ))}
        </div>
      </div>
      <Text size="xs" c="dimmed">
        ● — владение, ●● — экспертиза.
      </Text>
    </Fieldset>
  );
}

export default AbilitiesView;
