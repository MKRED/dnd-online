import {
  ActionIcon,
  ColorInput,
  Group,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconRotate, IconRotateClockwise } from '@tabler/icons-react';
import {
  MODEL_SCALE_MAX,
  MODEL_SCALE_MIN,
  type CharacterModel,
  type CharacterModelFit,
  type CharacterModelPatch,
} from 'shared';

interface ModelFitControlsProps {
  model: CharacterModel;
  onChange: (patch: CharacterModelPatch) => void;
}

// Масштаб на ползунке — степень двойки: середина — «как вписано», края — вчетверо
// меньше и больше. Линейный ползунок отдал бы почти весь ход увеличению.
const toSlider = (scale: number) => Math.log2(scale);
const fromSlider = (value: number) => Math.round(2 ** value * 100) / 100;

const turned = (turn: CharacterModelFit['turn'], step: 1 | -1) =>
  ((turn + step + 4) % 4) as CharacterModelFit['turn'];

// Цвет фигурки из STL и поправка к вписыванию (docs/plan/character-models.md).
function ModelFitControls({ model, onChange }: ModelFitControlsProps) {
  const { fit } = model;
  const setFit = (next: Partial<CharacterModelFit>) =>
    onChange({ fit: { ...fit, ...next } });
  return (
    <Stack gap="sm">
      {model.format === 'stl' && model.color && (
        <ColorInput
          label="Цвет фигурки"
          description="В STL нет цветов — фигурка будет одного цвета"
          format="hex"
          value={model.color}
          onChange={(color) => {
            if (/^#[0-9a-f]{6}$/i.test(color)) onChange({ color });
          }}
          maw={240}
        />
      )}
      <div>
        <Text size="sm" fw={500}>
          Размер: ×{fit.scale.toFixed(2)}
        </Text>
        <Text size="xs" c="dimmed">
          1 — основание во всю клетку
        </Text>
        <Slider
          aria-label="Размер модели"
          min={toSlider(MODEL_SCALE_MIN)}
          max={toSlider(MODEL_SCALE_MAX)}
          step={0.05}
          value={toSlider(fit.scale)}
          onChange={(value) => setFit({ scale: fromSlider(value) })}
          label={(value) => `×${fromSlider(value).toFixed(2)}`}
          marks={[{ value: 0, label: '×1' }]}
          mb="md"
          maw={260}
        />
      </div>
      <Group gap="xl" align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={4}>
            Лицом
          </Text>
          <Group gap={4}>
            <Tooltip label="Повернуть влево на четверть">
              <ActionIcon
                variant="default"
                aria-label="Повернуть модель влево"
                onClick={() => setFit({ turn: turned(fit.turn, 1) })}
              >
                <IconRotate size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Повернуть вправо на четверть">
              <ActionIcon
                variant="default"
                aria-label="Повернуть модель вправо"
                onClick={() => setFit({ turn: turned(fit.turn, -1) })}
              >
                <IconRotateClockwise size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </div>
        <div>
          <Text size="sm" fw={500} mb={4}>
            Верх модели
          </Text>
          <SegmentedControl
            aria-label="Какая ось модели — верх"
            size="xs"
            data={[
              { value: 'y', label: 'Ось Y' },
              { value: 'z', label: 'Ось Z' },
            ]}
            value={fit.up}
            onChange={(up) => setFit({ up: up === 'z' ? 'z' : 'y' })}
          />
        </div>
      </Group>
      <Text size="xs" c="dimmed">
        Модель лежит — смените ось верха. Смотрит вбок — поверните. Взгляд на
        карте задаёт фигурка.
      </Text>
    </Stack>
  );
}

export default ModelFitControls;
