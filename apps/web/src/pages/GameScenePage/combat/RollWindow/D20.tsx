import classes from './RollWindow.module.css';

interface D20Props {
  // Число на грани; null — ещё не брошен.
  value: number | null;
  rolling?: boolean;
  // Вторая кость при преимуществе или помехе, которая не засчитана.
  dropped?: boolean;
  size?: number;
}

// Плоская к20 (решение Михаила 2026-10-27: сначала плоская, объёмная — потом): шестиугольник
// с треугольной гранью и числом. Пока кость в полёте, она крутится.
function D20({
  value,
  rolling = false,
  dropped = false,
  size = 120,
}: D20Props) {
  return (
    <svg
      className={classes.die}
      data-rolling={rolling || undefined}
      data-dropped={dropped || undefined}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <polygon
        className={classes.dieBody}
        points="50,4 90,27 90,73 50,96 10,73 10,27"
      />
      <polygon className={classes.dieFace} points="50,24 79,72 21,72" />
      <path
        className={classes.dieEdge}
        d="M50,4 L50,24 M90,27 L79,72 M90,73 L79,72 M50,96 L79,72 M50,96 L21,72 M10,73 L21,72 M10,27 L21,72 M10,27 L50,24 M90,27 L50,24"
      />
      <text className={classes.dieValue} x="50" y="60" textAnchor="middle">
        {value ?? 20}
      </text>
    </svg>
  );
}

export default D20;
