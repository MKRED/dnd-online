import { Input, SegmentedControl } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { STEP_WHEN_LABELS, stepWhens, type StepLink } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

interface WhenFieldProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
  link: StepLink;
}

// «Когда» шага 2 и дальше — по исходу проверки прошлого шага. После шага без проверки
// выбора нет: шаг срабатывает всегда, поле не показываем.
function WhenField({ form, index, link }: WhenFieldProps) {
  const whens = stepWhens(link);
  if (whens.length < 2) return null;
  const labels = STEP_WHEN_LABELS[link.check];
  return (
    <Input.Wrapper label="Когда">
      <div>
        <SegmentedControl
          aria-label="Когда"
          // В карточке «Затем — …», а в форме рядом с «Когда» понятнее «Всегда».
          data={whens.map((value) => ({
            value,
            label: value === 'always' ? 'Всегда' : labels[value],
          }))}
          size="xs"
          mt={4}
          {...form.getInputProps(`steps.${index}.when`)}
        />
      </div>
    </Input.Wrapper>
  );
}

export default WhenField;
