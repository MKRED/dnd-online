import {
  isSpecialSpeed,
  isSpeedFeet,
  SPEED_CHANGE_LABELS,
  SPEED_FEET_MAX,
  SPEED_FEET_STEP,
  speedKey,
  speedNeedsFeet,
  type SpeedChange,
  type SpeedDetails,
} from 'shared';

// Поля составляющей «Скорость» в форме (shared/effectSpeed.ts). feet — '' пока поле
// пустое (так отдаёт NumberInput); sameAsSpeed — особая скорость «равна Скорости».
export interface SpeedValues {
  change: SpeedChange;
  feet: number | string;
  sameAsSpeed: boolean;
  hover: boolean;
}

// Чаще всего это «больше на N фт.», как у Longstrider; число вводит человек.
export const NEW_SPEED: SpeedValues = {
  change: 'faster',
  feet: '',
  sameAsSpeed: false,
  hover: false,
};

export function toSpeedValues(details: SpeedDetails): SpeedValues {
  return {
    change: details.change,
    feet: details.feet ?? '',
    sameAsSpeed: isSpecialSpeed(details.change) && details.feet === null,
    hover: details.hover,
  };
}

const usesFeet = (values: SpeedValues) =>
  speedNeedsFeet(values.change) ||
  (isSpecialSpeed(values.change) && !values.sameAsSpeed);

// Футы, введённые для другого изменения, и парение не у полёта остаются в форме, но не
// уходят: переключил обратно — поля на месте.
export function fromSpeedValues(values: SpeedValues): SpeedDetails {
  return {
    change: values.change,
    feet: usesFeet(values) ? Number(values.feet) : null,
    hover: values.change === 'fly' && values.hover,
  };
}

// Те же правила, что у сервера (isSpeedDetails, speedKey). earlier — составляющие
// «Скорость» выше этой в списке: повтор отмечаем у второй карточки.
export const speedValidate = {
  change: (values: SpeedValues, earlier: SpeedValues[]) => {
    const key = speedKey(fromSpeedValues(values));
    const twice = earlier.some(
      (other) => speedKey(fromSpeedValues(other)) === key,
    );
    if (!twice) return null;
    return key === 'change'
      ? 'Изменение Скорости уже есть в эффекте'
      : `«${SPEED_CHANGE_LABELS[values.change]}» уже есть в эффекте`;
  },
  feet: (values: SpeedValues) => {
    if (!usesFeet(values)) return null;
    return values.feet !== '' && isSpeedFeet(Number(values.feet))
      ? null
      : `Кратно ${SPEED_FEET_STEP}, до ${SPEED_FEET_MAX}`;
  },
};
