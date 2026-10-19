import { Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './AbilityLinks.module.css';

// Строки под заголовком группы, круга или частоты — с отступом, чтобы группы читались.
function GroupEntries({ children }: { children: ReactNode }) {
  return (
    <Stack gap={2} className={classes.groupEntries}>
      {children}
    </Stack>
  );
}

export default GroupEntries;
