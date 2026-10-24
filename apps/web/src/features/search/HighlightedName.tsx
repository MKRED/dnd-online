import { highlightMatch } from './highlightMatch';

interface HighlightedNameProps {
  name: string;
  query: string;
  className?: string;
}

// Название с подсвеченным совпадением: <mark> — чтобы и программа чтения с экрана
// знала, что это найденное.
function HighlightedName({ name, query, className }: HighlightedNameProps) {
  return (
    <span className={className}>
      {highlightMatch(name, query).map((part, i) =>
        part.match ? <mark key={i}>{part.text}</mark> : part.text,
      )}
    </span>
  );
}

export default HighlightedName;
