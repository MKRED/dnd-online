import type { UseFormReturnType } from '@mantine/form';
import DurationField from '../DurationField';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import ComponentsField from './ComponentsField';
import SaveEndsField from './SaveEndsField';

// Свои поля эффекта в форме: что он делает, сколько держится и чем снимается.
function EffectFields({ form }: { form: UseFormReturnType<SimpleFormValues> }) {
  return (
    <>
      <ComponentsField form={form} />
      <DurationField form={form} />
      <SaveEndsField form={form} />
    </>
  );
}

export default EffectFields;
