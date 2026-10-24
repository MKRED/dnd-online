import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import ActivationFields from './ActivationFields';
import CostsFields from './CostsFields';

// Общие поля способности: как применяют и что тратит (docs/plan/done/abilities.md).
// children — поля, которые зависят от активации и стоят сразу под ней: «Действует
// всегда» у черты (docs/plan/done/traits.md).
function UsageField({
  form,
  children,
}: {
  form: UseFormReturnType<SimpleFormValues>;
  children?: ReactNode;
}) {
  return (
    <Stack gap="md">
      <ActivationFields form={form} />
      {children}
      <CostsFields form={form} />
    </Stack>
  );
}

export default UsageField;
