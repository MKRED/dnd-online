import {
  ActionIcon,
  Button,
  Group,
  Input,
  Menu,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';
import {
  EFFECT_COMPONENT_KINDS,
  EFFECT_COMPONENT_LABELS,
  EFFECT_COMPONENTS_MAX,
  SINGLE_EFFECT_COMPONENT_KINDS,
  type EffectComponentKind,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import AdvantageComponentFields from './AdvantageComponentFields';
import ConditionComponentFields from './ConditionComponentFields';
import DefenseComponentFields from './DefenseComponentFields';
import NoHealingComponentFields from './NoHealingComponentFields';
import { newComponent } from './effectForm';
import PerTurnComponentFields from './PerTurnComponentFields';
import SenseComponentFields from './SenseComponentFields';
import SpeedComponentFields from './SpeedComponentFields';

interface ComponentsFieldProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Поля карточки по виду: новый вид без своих полей не соберётся.
const KIND_FIELDS: Record<
  EffectComponentKind,
  (props: ComponentsFieldProps & { index: number }) => ReactNode
> = {
  sense: SenseComponentFields,
  condition: ConditionComponentFields,
  per_turn: PerTurnComponentFields,
  defense: DefenseComponentFields,
  no_healing: NoHealingComponentFields,
  speed: SpeedComponentFields,
  advantage: AdvantageComponentFields,
};

// Составляющие эффекта списком карточек (docs/plan/effects.md): у каждой свои поля и
// крестик. Новая добавляется из меню видов — оно растёт с каждым этапом плана.
function ComponentsField({ form }: ComponentsFieldProps) {
  const { components } = form.getValues().effect;
  const full = components.length >= EFFECT_COMPONENTS_MAX;

  return (
    <Input.Wrapper
      label="Составляющие"
      description="Что эффект делает. Без составляющих эффект «Базовый»: всё, что он делает, — в описании"
    >
      <Stack gap="xs" mt={6}>
        {components.map((component, index) => {
          const Fields = KIND_FIELDS[component.kind];
          return (
            <Paper key={component.key} withBorder p="sm" radius="md">
              <Group justify="space-between" mb={4} wrap="nowrap">
                <Text size="sm" fw={500}>
                  {EFFECT_COMPONENT_LABELS[component.kind]}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Убрать составляющую"
                  title="Убрать составляющую"
                  onClick={() =>
                    form.removeListItem('effect.components', index)
                  }
                >
                  ✕
                </ActionIcon>
              </Group>
              <Fields form={form} index={index} />
            </Paper>
          );
        })}
        <Menu position="bottom-start">
          <Menu.Target>
            <Button
              variant="light"
              size="xs"
              w="fit-content"
              disabled={full}
              title={
                full
                  ? `Не больше ${EFFECT_COMPONENTS_MAX} составляющих`
                  : undefined
              }
            >
              + Составляющая
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {EFFECT_COMPONENT_KINDS.map((kind) => (
              <Menu.Item
                key={kind}
                // Вид без полей второй раз ничего не добавит.
                disabled={
                  SINGLE_EFFECT_COMPONENT_KINDS.includes(kind) &&
                  components.some((component) => component.kind === kind)
                }
                onClick={() =>
                  form.insertListItem('effect.components', newComponent(kind))
                }
              >
                {EFFECT_COMPONENT_LABELS[kind]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Stack>
    </Input.Wrapper>
  );
}

export default ComponentsField;
