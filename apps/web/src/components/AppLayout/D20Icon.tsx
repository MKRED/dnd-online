// Контур кубика d20: шестиугольник силуэта, верхняя грань-треугольник и рёбра к ней.
// Тот же рисунок лежит в public/favicon.svg — значке вкладки.
const EDGES = [
  'M12 2L21 7V17L12 22L3 17V7Z',
  'M12 7.5L17.5 16H6.5Z',
  'M3 7L12 7.5L21 7',
  'M3 7L6.5 16L3 17',
  'M21 7L17.5 16L21 17',
  'M6.5 16L12 22L17.5 16',
  'M12 2V7.5',
];

interface D20IconProps {
  className?: string;
}

// Цвет и размер задаёт className: обводка — currentColor, заливка — через CSS.
function D20Icon({ className }: D20IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {EDGES.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default D20Icon;
