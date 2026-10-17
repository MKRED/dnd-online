import type { UseFormReturnType } from '@mantine/form';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

// Круг подставляет затрату «Ячейка заклинаний» (решено с пользователем): у заговора её
// нет, а у заклинания 1 круга и выше галочка ставится, когда заклинание появилось —
// выбрали категорию (previous — null) или круг сменился с заговора. При смене одного
// круга на другой галочку не трогаем: её могли снять нарочно (сотворяют от черты).
export function suggestedSlotOn(
  level: number,
  previous: number | null,
  slotOn: boolean,
): boolean {
  if (level === 0) return false;
  return previous === null || previous === 0 ? true : slotOn;
}

export function suggestSpellSlot(
  form: UseFormReturnType<SimpleFormValues>,
  level: number,
  previous: number | null,
): void {
  const { slotOn } = form.getValues().usage;
  form.setFieldValue('usage.slotOn', suggestedSlotOn(level, previous, slotOn));
  if (level >= 1) form.setFieldValue('usage.slotLevel', level);
}
