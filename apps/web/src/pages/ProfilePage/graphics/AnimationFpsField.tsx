import { Input, Slider, Text } from '@mantine/core';
import { useState } from 'react';
import { ANIMATION_FPS_MAX } from 'shared';

const MARKS = [
  { value: 0, label: 'Выкл' },
  { value: 18, label: '18' },
  { value: 30, label: '30' },
  { value: ANIMATION_FPS_MAX, label: '60' },
];

const fpsLabel = (fps: number) => (fps === 0 ? 'без анимаций' : `${fps} к/с`);

interface AnimationFpsFieldProps {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

// Частота анимаций ползунком. Сохраняется, когда ползунок отпустили, а не на каждом
// шаге; пока тянут, значение живёт здесь. Родитель задаёт key по сохранённому значению,
// чтобы ответ сервера (или откат после ошибки) сбрасывал его.
// Значение видно только в заголовке: всплывающая подсказка ползунка налезала на описание.
function AnimationFpsField({
  value,
  disabled,
  onChange,
}: AnimationFpsFieldProps) {
  const [shown, setShown] = useState(value);
  return (
    <Input.Wrapper
      label={
        <>
          Анимации:{' '}
          <Text span inherit c="var(--mantine-primary-color-filled)">
            {fpsLabel(shown)}
          </Text>
        </>
      }
      description="Сколько раз в секунду двигается живое на карте (призрак над поверженным). 0 — всё стоит на месте"
    >
      <Slider
        mt="sm"
        mb="lg"
        min={0}
        max={ANIMATION_FPS_MAX}
        value={shown}
        onChange={setShown}
        onChangeEnd={onChange}
        disabled={disabled}
        marks={MARKS}
        label={null}
        thumbLabel="Частота анимаций"
      />
    </Input.Wrapper>
  );
}

export default AnimationFpsField;
