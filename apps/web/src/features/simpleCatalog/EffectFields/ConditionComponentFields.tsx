import { Select, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { CONDITION_KINDS, CONDITION_LABELS, type ConditionKind } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const CONDITION_OPTIONS = CONDITION_KINDS.map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}));

// Главное из правил книги (docs/dnd/conditions.md) — подсказка под выбором, чтобы не
// искать, чем «Опутанный» отличается от «Схваченного». Полные правила — в книге.
const CONDITION_HINTS: Record<ConditionKind, string> = {
  blinded: 'Не видит; атаки по нему с преимуществом, его — с помехой',
  charmed:
    'Не может атаковать очаровавшего; тот общается с ним с преимуществом',
  deafened: 'Не слышит, проваливает проверки на слух',
  exhaustion:
    'Каждое наложение — +1 уровень: −2 к к20 и −5 фт. скорости за уровень, на 6-м смерть',
  frightened:
    'Помеха к проверкам и атакам, пока видит источник страха; не может к нему приблизиться',
  grappled:
    'Скорость 0; помеха к атакам не по схватившему. Освобождается проверкой действием',
  incapacitated:
    'Ни действий, ни бонусных действий, ни реакций; теряет концентрацию, не говорит',
  invisible: 'Атаки по нему с помехой, его — с преимуществом',
  paralyzed:
    'Недееспособен, скорость 0, проваливает спасброски Силы и Ловкости; удар вблизи — крит',
  petrified:
    'Превращён в камень: недееспособен, скорость 0, сопротивление всему урону',
  poisoned: 'Помеха к броскам атаки и проверкам характеристик',
  prone:
    'Ползёт или встаёт за половину скорости; атаки вблизи по нему с преимуществом',
  restrained:
    'Скорость 0; атаки по нему с преимуществом, его — с помехой; помеха к спасброскам Ловкости',
  stunned:
    'Недееспособен, проваливает спасброски Силы и Ловкости; атаки по нему с преимуществом',
  unconscious:
    'Недееспособен и опрокинут, роняет всё из рук; удар вблизи — крит',
};

interface ConditionComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поле составляющей «Состояние»: одно из состояний книги.
function ConditionComponentFields({
  form,
  index,
}: ConditionComponentFieldsProps) {
  const path = `effect.components.${index}`;
  const { condition } = form.getValues().effect.components[index];

  // Подсказка под полем, а не в description: у поля 260 px, и длинная подсказка там
  // растянулась бы на несколько строк.
  return (
    <Stack gap={4}>
      <Select
        label="Состояние из книги"
        placeholder="Выберите состояние"
        required
        data={CONDITION_OPTIONS}
        allowDeselect={false}
        maw={260}
        {...form.getInputProps(`${path}.condition`)}
      />
      {condition && (
        <Text size="xs" c="dimmed">
          {CONDITION_HINTS[condition]}
        </Text>
      )}
    </Stack>
  );
}

export default ConditionComponentFields;
