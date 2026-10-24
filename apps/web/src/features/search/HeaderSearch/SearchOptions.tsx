import { Anchor, Combobox } from '@mantine/core';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { SearchGroup, SearchResult } from 'shared';
import HighlightedName from '../HighlightedName';
import { SEARCH_ICONS } from '../searchIcons';
import {
  SEARCH_GROUP_LABELS,
  searchHitDetails,
  searchHitPath,
  searchPagePath,
} from '../searchLabels';
import classes from './HeaderSearch.module.css';

interface SearchOptionsProps {
  result: SearchResult;
  query: string;
  // Переход по ссылке «ещё N» — список надо закрыть, как после выбора записи.
  onLeave: () => void;
}

// Ссылка в списке не должна забирать фокус у поля: иначе поле теряет фокус, список
// закрывается раньше, чем дойдёт клик, и переход не случается.
const keepFocus = (event: MouseEvent) => event.preventDefault();

function GroupLabel({
  group,
  query,
  onLeave,
}: { group: SearchGroup } & Omit<SearchOptionsProps, 'result'>) {
  const more = group.total - group.hits.length;
  return (
    <span className={classes.groupLabel}>
      {SEARCH_GROUP_LABELS[group.kind]}
      {more > 0 && (
        <Anchor
          component={Link}
          to={searchPagePath(query, group.kind)}
          size="xs"
          onMouseDown={keepFocus}
          onClick={onLeave}
        >
          ещё {more}
        </Anchor>
      )}
    </span>
  );
}

// Найденное группами по разделам; value пункта — адрес записи, его и открывает Enter.
function SearchOptions({ result, query, onLeave }: SearchOptionsProps) {
  return result.groups
    .filter((group) => group.hits.length > 0)
    .map((group) => {
      const Icon = SEARCH_ICONS[group.kind];
      const details = searchHitDetails(group);
      return (
        <Combobox.Group
          key={group.kind}
          label={<GroupLabel group={group} query={query} onLeave={onLeave} />}
        >
          {group.hits.map((hit, i) => (
            <Combobox.Option
              key={hit.id}
              value={searchHitPath(group.kind, hit.id)}
              className={classes.option}
            >
              <span className={classes.icon} aria-hidden>
                <Icon size={16} />
              </span>
              <HighlightedName
                name={hit.name}
                query={query}
                className={classes.name}
              />
              <span className={classes.detail}>{details[i]}</span>
            </Combobox.Option>
          ))}
        </Combobox.Group>
      );
    });
}

export default SearchOptions;
