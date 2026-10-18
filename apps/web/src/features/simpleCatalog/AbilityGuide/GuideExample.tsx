import { Accordion, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { DetailsField } from '../../catalog';
import { abilityRows } from '../abilityRows';
import type { GuideExample as Example } from './guideExamples';

// Пример гайда: слева что выбрать в форме, справа — какой выйдет карточка. Карточка
// строится настоящим кодом (abilityRows), поэтому не отстанет от формы.
function GuideExample({ example }: { example: Example }) {
  return (
    <Accordion.Item value={example.name}>
      <Accordion.Control>
        <Text fw={500}>{example.name}</Text>
        <Text size="sm" c="dimmed">
          {example.idea}
        </Text>
      </Accordion.Control>
      <Accordion.Panel>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Что выбрать
            </Text>
            {example.fill.map(({ field, value }) => (
              <DetailsField key={field} label={field}>
                {value}
              </DetailsField>
            ))}
            {example.note && (
              <Text size="sm" c="dimmed">
                {example.note}
              </Text>
            )}
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Карточка
            </Text>
            <Paper withBorder p="sm" radius="md">
              <Stack gap={6}>
                <Text fw={500}>{example.name}</Text>
                {abilityRows(example.ability).map(({ label, value }) => (
                  <DetailsField key={label} label={label}>
                    {value}
                  </DetailsField>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </SimpleGrid>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export default GuideExample;
