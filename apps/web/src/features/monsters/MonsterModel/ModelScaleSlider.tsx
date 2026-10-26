import { Slider, Text } from '@mantine/core';
import { MODEL_SCALE_MAX, MODEL_SCALE_MIN } from 'shared';

// Масштаб на ползунке — степень двойки, как у модели персонажа (ModelFitControls):
// середина — «как вписано», края — вчетверо меньше и больше.
const toSlider = (scale: number) => Math.log2(scale);
const fromSlider = (value: number) => Math.round(2 ** value * 100) / 100;

const scaleText = (scale: number) => `×${String(scale).replace('.', ',')}`;

// Поправка к вписыванию модели монстра в его место (×0,25…×4).
function ModelScaleSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (scale: number) => void;
}) {
  return (
    <div>
      <Text size="sm" fw={500}>
        Размер на карте: {scaleText(value)}
      </Text>
      <Slider
        thumbLabel="Размер модели на карте"
        min={toSlider(MODEL_SCALE_MIN)}
        max={toSlider(MODEL_SCALE_MAX)}
        step={0.05}
        value={toSlider(value)}
        onChange={(next) => onChange(fromSlider(next))}
        label={(next) => scaleText(fromSlider(next))}
        marks={[
          { value: toSlider(MODEL_SCALE_MIN), label: '×0,25' },
          { value: 0, label: '×1' },
          { value: toSlider(MODEL_SCALE_MAX), label: '×4' },
        ]}
        mb="lg"
        maw={320}
      />
    </div>
  );
}

export default ModelScaleSlider;
