// Название, разрезанное на части вокруг первого вхождения запроса (без учёта регистра):
// совпадение подсвечивается, остальное — как есть. Не нашлось — одна часть целиком.
export interface NamePart {
  text: string;
  match: boolean;
}

export function highlightMatch(name: string, query: string): NamePart[] {
  const q = query.trim();
  const at = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return [{ text: name, match: false }];
  const parts = [
    { text: name.slice(0, at), match: false },
    { text: name.slice(at, at + q.length), match: true },
    { text: name.slice(at + q.length), match: false },
  ];
  return parts.filter((part) => part.text !== '');
}
