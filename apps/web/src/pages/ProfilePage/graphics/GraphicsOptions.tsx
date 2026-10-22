import { Input, SegmentedControl, Stack, Switch } from '@mantine/core';
import type {
  CreatureModelMode,
  FrameLimit,
  GraphicsSettings,
  RenderScale,
} from 'shared';
import AnimationFpsField from './AnimationFpsField';

interface GraphicsOptionsProps {
  value: GraphicsSettings;
  disabled: boolean;
  onChange: (patch: Partial<GraphicsSettings>) => void;
}

const MODEL_OPTIONS: { value: CreatureModelMode; label: string }[] = [
  { value: 'all', label: 'У всех' },
  { value: 'party', label: 'Только отряд' },
  { value: 'none', label: 'Карточки' },
];

const SCALE_OPTIONS: { value: RenderScale; label: string }[] = [
  { value: 1, label: 'Как у экрана' },
  { value: 0.75, label: '75 %' },
  { value: 0.5, label: '50 %' },
];

const LIMIT_OPTIONS: { value: FrameLimit; label: string }[] = [
  { value: 0, label: 'Нет' },
  { value: 60, label: '60 к/с' },
  { value: 30, label: '30 к/с' },
];

// SegmentedControl работает со строками, а в настройках бывают и числа.
function Choice<T extends string | number>({
  label,
  description,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  options: { value: T; label: string }[];
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <Input.Wrapper label={label} description={description}>
      <SegmentedControl
        mt={6}
        fullWidth
        disabled={disabled}
        aria-label={label}
        value={String(value)}
        data={options.map((option) => ({
          value: String(option.value),
          label: option.label,
        }))}
        onChange={(next) => {
          const option = options.find((o) => String(o.value) === next);
          if (option) onChange(option.value);
        }}
      />
    </Input.Wrapper>
  );
}

// Настройки графики по одной. Любое изменение переводит набор в «Своё» (это решает
// GraphicsSection).
function GraphicsOptions({ value, disabled, onChange }: GraphicsOptionsProps) {
  return (
    <Stack gap="lg">
      <AnimationFpsField
        key={value.animationFps}
        value={value.animationFps}
        disabled={disabled}
        onChange={(animationFps) => onChange({ animationFps })}
      />
      <Choice
        label="3D-модели существ"
        description="Отряд — фигурки персонажей игроков. Без модели существо стоит карточкой"
        options={MODEL_OPTIONS}
        value={value.creatureModels}
        disabled={disabled}
        onChange={(creatureModels) => onChange({ creatureModels })}
      />
      <Choice
        label="Чёткость картинки"
        description="Ниже — чуть мыльнее, но заметно легче видеокарте"
        options={SCALE_OPTIONS}
        value={value.renderScale}
        disabled={disabled}
        onChange={(renderScale) => onChange({ renderScale })}
      />
      <Choice
        label="Предел кадров"
        description="Как часто рисуется карта, пока движется камера. Меньше — тише вентилятор, но движение дёрганее"
        options={LIMIT_OPTIONS}
        value={value.frameLimit}
        disabled={disabled}
        onChange={(frameLimit) => onChange({ frameLimit })}
      />
      <Switch
        label="Сглаживание краёв"
        description="Убирает «лесенку» на краях блоков и моделей"
        checked={value.antialias}
        disabled={disabled}
        onChange={(event) =>
          onChange({ antialias: event.currentTarget.checked })
        }
      />
    </Stack>
  );
}

export default GraphicsOptions;
