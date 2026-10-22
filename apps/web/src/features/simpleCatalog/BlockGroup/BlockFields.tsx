import {
  ColorInput,
  Fieldset,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  BLOCK_ARMOR_CLASS_MAX,
  BLOCK_HIT_POINTS_MAX,
  HAZARD_NAMES,
  HAZARD_TRIGGER,
  HAZARDS,
  hazardLabel,
  MATERIALS,
  type MaterialName,
} from 'shared';
import { ShapeSwatch } from '../../maps';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { colorAfterLookChange } from './blockForm';

const LOOK_OPTIONS = (Object.keys(MATERIALS) as MaterialName[]).map(
  (value) => ({ value, label: MATERIALS[value].label }),
);

const HAZARD_OPTIONS = [
  { value: 'none', label: 'Нет' },
  ...HAZARD_NAMES.map((value) => ({ value, label: MATERIALS[value].label })),
];

// Поля группы блоков (docs/plan/blocks.md, этап 4): вид — основа и основной цвет,
// затем свойства для правил, общие для всех форм группы.
function BlockFields({ form }: { form: UseFormReturnType<SimpleFormValues> }) {
  const { block } = form.getValues();
  const hazard = block.hazard === 'none' ? null : HAZARDS[block.hazard];
  return (
    <Stack gap="md">
      <Fieldset legend="Вид">
        <Group align="flex-start" gap="md">
          <Select
            label="Основа"
            description="Текстуры этого базового блока, пока у группы нет своих"
            data={LOOK_OPTIONS}
            allowDeselect={false}
            searchable
            leftSection={
              <ShapeSwatch material={block.look} shape="cube" size={22} />
            }
            renderOption={({ option }) => (
              <Group gap="xs" wrap="nowrap">
                <ShapeSwatch
                  material={option.value as MaterialName}
                  shape="cube"
                  size={22}
                />
                {option.label}
              </Group>
            )}
            w={260}
            {...form.getInputProps('block.look')}
            onChange={(value) => {
              if (!value) return;
              const look = value as MaterialName;
              form.setFieldValue(
                'block.color',
                colorAfterLookChange(form.getValues().block, look),
              );
              form.setFieldValue('block.look', look);
            }}
          />
          <ColorInput
            label="Основной цвет"
            description="Узор основы перекрашивается в него"
            format="hex"
            w={200}
            {...form.getInputProps('block.color')}
          />
        </Group>
      </Fieldset>
      <Fieldset legend="Свойства для правил — у всех форм группы">
        <Stack gap="sm">
          <Switch
            label="Закрывает обзор"
            description="Сквозь стекло, лёд и листву видно"
            {...form.getInputProps('block.opaque', { type: 'checkbox' })}
          />
          <Switch
            label="Труднопроходимая местность"
            description="Шаг по блоку стоит 10 футов"
            {...form.getInputProps('block.difficult', { type: 'checkbox' })}
          />
          <Switch
            label="Горит"
            {...form.getInputProps('block.flammable', { type: 'checkbox' })}
          />
          <Switch
            label="Можно лазать"
            description="Как по лестнице или лозе. Путь пока этого не учитывает"
            {...form.getInputProps('block.climbable', { type: 'checkbox' })}
          />
          <Select
            label="Опасность"
            description={
              hazard
                ? `${hazardLabel(hazard)} — тому, ${HAZARD_TRIGGER}`
                : 'Урон тому, кто встал на блок, — как у лавы или кислоты'
            }
            data={HAZARD_OPTIONS}
            allowDeselect={false}
            maw={320}
            {...form.getInputProps('block.hazard')}
          />
          <Switch
            label="Разрушается атаками"
            description="Грунт не разрушается; камень, дерево и стекло — да"
            {...form.getInputProps('block.breakable', { type: 'checkbox' })}
          />
          {block.breakable && (
            <Group gap="md">
              <NumberInput
                label="КД"
                min={1}
                max={BLOCK_ARMOR_CLASS_MAX}
                allowDecimal={false}
                w={100}
                {...form.getInputProps('block.armorClass')}
              />
              <NumberInput
                label="ХП"
                min={1}
                max={BLOCK_HIT_POINTS_MAX}
                allowDecimal={false}
                w={100}
                {...form.getInputProps('block.hitPoints')}
              />
            </Group>
          )}
        </Stack>
      </Fieldset>
    </Stack>
  );
}

export default BlockFields;
