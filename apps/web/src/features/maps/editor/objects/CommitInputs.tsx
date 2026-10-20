import { NumberInput, TextInput } from '@mantine/core';
import { useState } from 'react';
import { OBJECT_NAME_MAX, OBJECT_QUANTITY_MAX } from 'shared';

// Поля свойств объекта пишут правку только по уходу из поля или Enter: каждая правка —
// запись журнала, и набор «12» по цифрам дал бы две отмены. Новое значение с сервера
// приходит через key: поле пересоздаётся с ним. Если сервер правку отклонил (груз не
// влез), значение не меняется и key тоже — тогда черновик сбрасывает useDraft.

// Черновик поля: возвращается к value, когда правка закончилась (disabled снялся), —
// успешная к этому времени уже пересоздала поле через key.
function useDraft<T>(value: T, disabled: boolean | undefined) {
  const [draft, setDraft] = useState<T>(value);
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (!disabled) setDraft(value);
  }
  return [draft, setDraft] as const;
}

interface QuantityInputProps {
  value: number;
  onCommit: (quantity: number) => void;
  label?: string;
  'aria-label'?: string;
  w?: number;
  disabled?: boolean;
}

export function QuantityInput({
  value,
  onCommit,
  ...rest
}: QuantityInputProps) {
  const [draft, setDraft] = useDraft<number | string>(value, rest.disabled);
  const commit = () => {
    const quantity = Number(draft);
    if (Number.isInteger(quantity) && quantity >= 1 && quantity !== value) {
      onCommit(quantity);
    } else setDraft(value);
  };
  return (
    <NumberInput
      size="xs"
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && commit()}
      min={1}
      max={OBJECT_QUANTITY_MAX}
      allowDecimal={false}
      allowNegative={false}
      clampBehavior="strict"
      {...rest}
    />
  );
}

interface NameInputProps {
  value: string;
  onCommit: (name: string) => void;
  disabled?: boolean;
}

export function NameInput({ value, onCommit, disabled }: NameInputProps) {
  const [draft, setDraft] = useDraft(value, disabled);
  const commit = () => {
    const name = draft.trim();
    if (name && name !== value) onCommit(name);
    else setDraft(value);
  };
  return (
    <TextInput
      size="xs"
      label="Название"
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && commit()}
      maxLength={OBJECT_NAME_MAX}
      disabled={disabled}
    />
  );
}
