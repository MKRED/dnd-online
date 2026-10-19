import type { UseFormReturnType } from '@mantine/form';
import { useCallback, useState } from 'react';
import type { MonsterFormValues } from './monsterFormValues';

// Значение поля для подсказок и блокировок соседних полей. Форма uncontrolled и сама
// секцию не перерисовывает — следим за полем и держим его в состоянии.
export function useWatched<T>(
  form: UseFormReturnType<MonsterFormValues>,
  path: string,
  read: (values: MonsterFormValues) => T,
): T {
  const [value, setValue] = useState(() => read(form.getValues()));
  // Путь задан строкой — тип значения Mantine по нему не выводит, его знает read.
  form.watch(
    path,
    useCallback(
      ({ value: next }: { value: unknown }) => setValue(next as T),
      [],
    ),
  );
  return value;
}
