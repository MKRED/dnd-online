import { ActionIcon } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import classes from './HeaderSearch.module.css';
import SearchBox from './SearchBox';
import { useSlashHotkey } from './useSlashHotkey';

interface HeaderSearchProps {
  // Телефон: поля в шапке нет места, вместо него значок.
  compact: boolean;
}

// Поиск в шапке на всех страницах. На широком экране — поле посередине шапки; на
// телефоне — значок, который раскрывает поле поверх шапки.
function HeaderSearch({ compact }: HeaderSearchProps) {
  const wide = !compact;
  const [expanded, setExpanded] = useState(false);
  const expand = useCallback(() => setExpanded(true), []);
  // Пока поля нет, «/» (с клавиатуры планшета) раскрывает его; дальше слушает само поле.
  useSlashHotkey(wide || expanded ? null : expand);

  if (wide) {
    return (
      <div className={classes.wide}>
        <SearchBox />
      </div>
    );
  }
  if (!expanded) {
    return (
      <ActionIcon
        variant="subtle"
        size="lg"
        aria-label="Поиск"
        onClick={expand}
      >
        <IconSearch size={20} />
      </ActionIcon>
    );
  }
  return (
    <div className={classes.phone}>
      <SearchBox onClose={() => setExpanded(false)} />
    </div>
  );
}

export default HeaderSearch;
