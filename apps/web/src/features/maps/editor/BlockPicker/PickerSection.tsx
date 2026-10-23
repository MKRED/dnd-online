import { Stack, Text } from '@mantine/core';
import type { ReactNode, Ref } from 'react';
import classes from './BlockPicker.module.css';

// Раздел окна выбора блока: заголовок и сетка плиток.
function PickerSection({
  title,
  sectionRef,
  children,
}: {
  title: string;
  sectionRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <Stack gap={4} ref={sectionRef}>
      <Text size="sm" fw={500}>
        {title}
      </Text>
      <div className={classes.grid}>{children}</div>
    </Stack>
  );
}

export default PickerSection;
