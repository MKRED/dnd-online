import type { SearchKind } from 'shared';
import HighlightedName from './HighlightedName';
import { SEARCH_ICONS } from './searchIcons';
import classes from './SearchHit.module.css';

interface SearchHitProps {
  kind: SearchKind;
  name: string;
  query: string;
  detail: string;
  // Чья запись — на странице всех результатов; в выпадающем списке не нужно.
  owner?: string;
}

// Части строки найденного без обёртки: обёрткой служит пункт списка или ссылка.
function SearchHit({ kind, name, query, detail, owner }: SearchHitProps) {
  const Icon = SEARCH_ICONS[kind];
  return (
    <>
      <span className={classes.icon} aria-hidden>
        <Icon size={16} />
      </span>
      <HighlightedName name={name} query={query} className={classes.name} />
      <span className={classes.detail}>{detail}</span>
      {owner !== undefined && <span className={classes.owner}>{owner}</span>}
    </>
  );
}

export default SearchHit;
