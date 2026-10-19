import type { UseFormReturnType } from '@mantine/form';
import { useCallback, useState } from 'react';
import type { MonsterFormValues } from './monsterFormValues';

type ListPath = 'skills' | 'senses';

// Ключи строк списка (навыки, чувства). Как в списке классов персонажа (ClassesList):
// watch на список срабатывает и на правку поля строки, поэтому в состоянии держим только
// id и возвращаем прежний массив, если строки не добавляли и не убирали, — иначе каждая
// буква перерисовывала бы все строки.
export function useRowIds(
  form: UseFormReturnType<MonsterFormValues>,
  path: ListPath,
): string[] {
  const [ids, setIds] = useState(() =>
    form.getValues()[path].map((row) => row.id),
  );
  form.watch(
    path,
    useCallback(({ value }: { value: { id: string }[] }) => {
      const next = value.map((row) => row.id);
      setIds((prev) =>
        prev.length === next.length && prev.every((id, i) => id === next[i])
          ? prev
          : next,
      );
    }, []),
  );
  return ids;
}
