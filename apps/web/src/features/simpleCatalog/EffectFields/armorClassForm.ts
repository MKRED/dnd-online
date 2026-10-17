import {
  ARMOR_CLASS_CHANGE_LABELS,
  ARMOR_CLASS_LIMITS,
  armorClassKey,
  isArmorClassValue,
  type ArmorClassChange,
  type ArmorClassDetails,
} from 'shared';

// Поля составляющей «Класс доспеха» в форме (shared/effectArmorClass.ts). value — ''
// пока поле пустое (так отдаёт NumberInput).
export interface ArmorClassValues {
  change: ArmorClassChange;
  value: number | string;
}

// Чаще всего это «больше на N», как у Shield of Faith; число вводит человек.
export const NEW_ARMOR_CLASS: ArmorClassValues = { change: 'bonus', value: '' };

export const fromArmorClassValues = (
  values: ArmorClassValues,
): ArmorClassDetails => ({
  change: values.change,
  value: Number(values.value),
});

// Те же правила, что у сервера (isArmorClassDetails, armorClassKey). earlier —
// составляющие «Класс доспеха» выше этой в списке: повтор отмечаем у второй карточки.
export const armorClassValidate = {
  change: (values: ArmorClassValues, earlier: ArmorClassValues[]) => {
    const key = armorClassKey(fromArmorClassValues(values));
    const twice = earlier.some(
      (other) => armorClassKey(fromArmorClassValues(other)) === key,
    );
    if (!twice) return null;
    return key === 'shift'
      ? 'Изменение КД на N уже есть в эффекте'
      : `«${ARMOR_CLASS_CHANGE_LABELS[values.change]}» уже есть в эффекте`;
  },
  value: (values: ArmorClassValues) => {
    const { min, max } = ARMOR_CLASS_LIMITS[values.change];
    return values.value !== '' &&
      isArmorClassValue(values.change, Number(values.value))
      ? null
      : `От ${min} до ${max}`;
  },
};
