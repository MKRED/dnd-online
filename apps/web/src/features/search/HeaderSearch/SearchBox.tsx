import {
  Anchor,
  CloseButton,
  Combobox,
  Kbd,
  Loader,
  Overlay,
  ScrollArea,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEARCH_QUERY_MAX_LENGTH } from 'shared';
import { searchPagePath } from '../searchLabels';
import { SEARCH_MIN_LENGTH, useSearchResults } from '../useSearchResults';
import classes from './HeaderSearch.module.css';
import SearchOptions from './SearchOptions';
import { useSlashHotkey } from './useSlashHotkey';

// В выпадающем списке — по три записи раздела, остальное — «ещё N».
const DROPDOWN_LIMIT = 3;

interface SearchBoxProps {
  // Телефон: поле раскрыто поверх шапки, у него крестик «Закрыть поиск».
  onClose?: () => void;
}

// Поле общего поиска с выпадающим списком по разделам (макет «Поиск 1. В шапке»).
function SearchBox({ onClose }: SearchBoxProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const combobox = useCombobox();
  const { query, result, loading, error } = useSearchResults(value, {
    limit: DROPDOWN_LIMIT,
  });
  useSlashHotkey(useCallback(() => inputRef.current?.focus(), []));

  const typed = value.trim();
  const open = focused && typed.length >= SEARCH_MIN_LENGTH;
  const total = result?.groups.reduce((sum, g) => sum + g.total, 0) ?? 0;
  // Пока печатают, ответ ещё на старый запрос: крутим загрузку.
  const busy = open && (loading || typed !== query);

  // Сразу выбрана первая запись: Enter открывает её, как в макете.
  const { selectFirstOption } = combobox;
  useEffect(() => {
    if (result) selectFirstOption();
  }, [result, selectFirstOption]);

  const leave = () => {
    setValue('');
    combobox.closeDropdown();
    inputRef.current?.blur();
    onClose?.();
  };

  const hint = busy ? (
    <Loader size="xs" />
  ) : focused ? (
    <Kbd size="xs">Esc</Kbd>
  ) : (
    <Kbd size="xs">/</Kbd>
  );

  return (
    <>
      {open && <Overlay fixed className={classes.overlay} />}
      <Combobox
        store={combobox}
        onOptionSubmit={(path) => {
          leave();
          void navigate(path);
        }}
        classNames={{
          dropdown: classes.dropdown,
          groupLabel: classes.groupLabelBox,
        }}
      >
        <Combobox.DropdownTarget>
          <Combobox.EventsTarget>
            <TextInput
              ref={inputRef}
              classNames={{ input: classes.input }}
              value={value}
              maxLength={SEARCH_QUERY_MAX_LENGTH}
              placeholder="Поиск по справочнику, персонажам и картам"
              aria-label="Поиск"
              leftSection={<IconSearch size={18} aria-hidden />}
              rightSection={
                onClose ? (
                  <CloseButton aria-label="Закрыть поиск" onClick={leave} />
                ) : (
                  hint
                )
              }
              rightSectionPointerEvents={onClose ? 'auto' : 'none'}
              autoFocus={Boolean(onClose)}
              onChange={(event) => {
                setValue(event.currentTarget.value);
                combobox.openDropdown();
              }}
              onFocus={() => {
                setFocused(true);
                combobox.openDropdown();
              }}
              onBlur={() => {
                setFocused(false);
                combobox.closeDropdown();
                // На телефоне поле без фокуса только мешает: шапка возвращается.
                if (onClose && !typed) onClose();
              }}
              onKeyDown={(event) => {
                // Первый Esc закрывает список (это делает Combobox), второй — уводит из поля.
                if (event.key === 'Escape' && !combobox.dropdownOpened) {
                  inputRef.current?.blur();
                }
              }}
            />
          </Combobox.EventsTarget>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown hidden={!open}>
          <ScrollArea.Autosize mah="calc(100dvh - 140px)" type="scroll">
            <Combobox.Options aria-label="Найденное">
              {error ? (
                <Combobox.Empty c="red">{error}</Combobox.Empty>
              ) : result && total === 0 ? (
                <Combobox.Empty>Ничего не нашлось по «{query}»</Combobox.Empty>
              ) : result ? (
                <SearchOptions result={result} query={query} onLeave={leave} />
              ) : (
                <Combobox.Empty>Ищем…</Combobox.Empty>
              )}
            </Combobox.Options>
          </ScrollArea.Autosize>
          {total > 0 && (
            <Combobox.Footer className={classes.footer}>
              <Text span size="xs" c="dimmed" visibleFrom="sm">
                <Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> выбрать ·{' '}
                <Kbd size="xs">Enter</Kbd> открыть · <Kbd size="xs">Esc</Kbd>{' '}
                закрыть
              </Text>
              <Anchor
                component={Link}
                to={searchPagePath(query)}
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={leave}
              >
                Все результаты: {total}
              </Anchor>
            </Combobox.Footer>
          )}
        </Combobox.Dropdown>
      </Combobox>
    </>
  );
}

export default SearchBox;
