import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import StepsField from './StepsField';
import UsageField from './UsageField';

// Активация и затраты, потом «Применение»: сначала как применяют, затем что происходит.
function AbilityFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  return (
    <Stack gap="md">
      <UsageField form={form} />
      <StepsField form={form} />
    </Stack>
  );
}

export default AbilityFields;
