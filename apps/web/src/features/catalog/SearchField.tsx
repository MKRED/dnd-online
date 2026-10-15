import { CloseButton, Kbd, TextInput } from '@mantine/core';
import { useWindowEvent } from '@mantine/hooks';
import { useRef } from 'react';

const NON_TEXT_INPUTS = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
]);

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement)
    return true;
  // У Select без поиска поле только для чтения — в нём «/» тоже ничего не вводит.
  return (
    target instanceof HTMLInputElement &&
    !target.readOnly &&
    !NON_TEXT_INPUTS.has(target.type)
  );
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

// Поиск по названию над списком каталога. Esc и крестик очищают его.
function SearchField({ value, onChange }: SearchFieldProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  // «/» — к поиску, как на многих сайтах. useHotkeys из Mantine молчит в любом <input>,
  // а здесь фокус часто на чипе или переключателе (это тоже input), поэтому
  // пропускаем только поля, где «/» — обычный ввод текста.
  useWindowEvent('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    if (isTextEntry(event.target)) return;
    event.preventDefault();
    searchRef.current?.focus();
  });

  return (
    <TextInput
      ref={searchRef}
      aria-label="Поиск по названию"
      placeholder="Поиск по названию"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onChange('');
      }}
      rightSection={
        value ? (
          <CloseButton
            aria-label="Очистить поиск"
            onClick={() => onChange('')}
          />
        ) : (
          <Kbd size="xs" visibleFrom="xs">
            /
          </Kbd>
        )
      }
    />
  );
}

export default SearchField;
