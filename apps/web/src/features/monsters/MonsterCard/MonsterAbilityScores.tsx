import { Fieldset, Group, Paper, SimpleGrid, Text } from '@mantine/core';
import {
  ABILITY_SCORES,
  getAbilityModifier,
  type MonsterStatBlock,
} from 'shared';
import { ABILITY_LABELS, SheetField } from '../../characters';
import { formatSigned, formatSkills } from './monsterCardText';

// Характеристики плитками: значение, модификатор и спасбросок, как ввёл мастер. Спасбросок
// выше модификатора — владение, он выделен, как владение на листе персонажа.
function MonsterAbilityScores({ block }: { block: MonsterStatBlock }) {
  const skills = formatSkills(block);
  return (
    <Fieldset legend="Характеристики">
      {/* Колонки — по ширине самого блока, а не окна: в окне карточки на сцене игры
          (docs/plan/done/scene-page.md, этап 4) шесть колонок не помещаются. */}
      <SimpleGrid
        type="container"
        cols={{ base: 2, '360px': 3, '640px': 6 }}
        spacing="xs"
      >
        {ABILITY_SCORES.map((ability) => {
          const { score, save } = block.abilities[ability];
          const modifier = getAbilityModifier(score);
          return (
            <Paper key={ability} withBorder radius="md" p="xs">
              <Group justify="space-between" align="baseline" wrap="nowrap">
                <Text size="sm" fw={600}>
                  {ABILITY_LABELS[ability]}
                </Text>
                <Text size="sm" c="dimmed">
                  {score}
                </Text>
              </Group>
              <Text fw={700} size="xl" lh={1.2}>
                {formatSigned(modifier)}
              </Text>
              <Text
                size="sm"
                fw={save !== modifier ? 600 : 400}
                c={save !== modifier ? undefined : 'dimmed'}
              >
                Спасбросок {formatSigned(save)}
              </Text>
            </Paper>
          );
        })}
      </SimpleGrid>
      {skills && (
        <div style={{ marginTop: 'var(--mantine-spacing-sm)' }}>
          <SheetField label="Навыки">{skills}</SheetField>
        </div>
      )}
    </Fieldset>
  );
}

export default MonsterAbilityScores;
