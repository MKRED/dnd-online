import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import ActivationFields from './ActivationFields';
import CostsFields from './CostsFields';

// Общие поля способности: как применяют и что тратит (docs/plan/done/abilities.md).
function UsageField({ form }: { form: UseFormReturnType<SimpleFormValues> }) {
  return (
    <Stack gap="md">
      <ActivationFields form={form} />
      <CostsFields form={form} />
    </Stack>
  );
}

export default UsageField;
