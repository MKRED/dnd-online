import { Indicator, Stack, Text, UnstyledButton } from '@mantine/core';
import { SHAPE_LABELS, SHAPE_NAMES, type ShapeName } from 'shared';
import { ShapeSwatch } from '../../maps';
import { shapeAppearance, type GroupLook } from './shapeAppearance';

interface ShapeTabsProps {
  group: GroupLook;
  value: ShapeName;
  onChange: (shape: ShapeName) => void;
}

// Чьи текстуры правим: «Блок» — группы, остальные — отдельной формы (docs/plan/blocks.md,
// этап 5б). Значок показывает, как форма выглядит сейчас; точка — у формы свой вид.
function ShapeTabs({ group, value, onChange }: ShapeTabsProps) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        «Блок» — текстуры всей группы. Выберите форму, чтобы дать ей свои.
      </Text>
      <div
        role="radiogroup"
        aria-label="Форма"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
      >
        {SHAPE_NAMES.map((shape) => {
          const active = shape === value;
          const own = shape !== 'cube' && group.shapes[shape] !== undefined;
          return (
            <UnstyledButton
              key={shape}
              role="radio"
              aria-checked={active}
              aria-label={
                own
                  ? `${SHAPE_LABELS[shape]} (свои текстуры)`
                  : SHAPE_LABELS[shape]
              }
              onClick={() => onChange(shape)}
              w={72}
              py={6}
              style={{
                borderRadius: 'var(--mantine-radius-sm)',
                border: `1px solid ${
                  active
                    ? 'var(--mantine-primary-color-filled)'
                    : 'var(--mantine-color-default-border)'
                }`,
                background: active
                  ? 'var(--mantine-primary-color-light)'
                  : undefined,
              }}
            >
              <Stack gap={2} align="center">
                <Indicator disabled={!own} size={8} offset={2}>
                  <ShapeSwatch
                    material={group.look}
                    {...shapeAppearance(group, shape)}
                    shape={shape}
                    size={32}
                  />
                </Indicator>
                <Text size="xs" ta="center" lh={1.15}>
                  {SHAPE_LABELS[shape]}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </div>
    </Stack>
  );
}

export default ShapeTabs;
