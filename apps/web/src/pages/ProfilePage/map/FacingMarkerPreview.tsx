import type { FacingMarker } from 'shared';

// Подставка сверху, как её рисует сцена (MapScene/objects/StandBase), взгляд — вверх.
// Те же доли стороны места, что в standShapes, только y экрана смотрит вниз.
const BASE = '#9c3b30';
const LIGHT = '#f8f9fa';
const DARK = '#1a1b1e';
const R = 0.46;

function chevron(tip: number, arm: number, thick: number) {
  const points = [
    [0, tip],
    [arm, tip - arm],
    [arm, tip - arm - thick],
    [0, tip - thick],
    [-arm, tip - arm - thick],
    [-arm, tip - arm],
  ];
  return (
    <polygon
      points={points.map(([x, y]) => `${x},${-y}`).join(' ')}
      fill={LIGHT}
      stroke={DARK}
      strokeWidth={0.04}
      strokeLinejoin="round"
      paintOrder="stroke"
    />
  );
}

// Капля «указателя»: нос с вершиной на 1,5 радиуса, стороны касаются круга.
function dropPath() {
  const tip = R * 1.5;
  const a = Math.acos(R / tip);
  const x = R * Math.sin(a);
  const y = R * Math.cos(a);
  return `M0,${-tip} L${x},${-y} A${R},${R} 0 1 1 ${-x},${-y} Z`;
}

function Marks({ marker }: { marker: FacingMarker }) {
  if (marker === 'pointer') {
    return (
      <>
        <path
          d={dropPath()}
          fill={BASE}
          stroke={LIGHT}
          strokeWidth={0.035}
          strokeLinejoin="round"
        />
        {chevron(0.62, 0.1, 0.06)}
      </>
    );
  }
  const disc = <circle r={R} fill={BASE} />;
  if (marker === 'chevrons') {
    return (
      <>
        {disc}
        <g opacity={0.7}>{chevron(0.31, 0.12, 0.06)}</g>
        {chevron(0.42, 0.12, 0.06)}
      </>
    );
  }
  return (
    <>
      {disc}
      <circle
        r={0.415}
        fill="none"
        stroke={LIGHT}
        strokeOpacity={0.55}
        strokeWidth={0.05}
      />
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={i}
          y1={-0.37}
          y2={-0.46}
          stroke={DARK}
          strokeOpacity={0.6}
          strokeWidth={0.025}
          transform={`rotate(${i * 45})`}
        />
      ))}
      <polygon
        points="0,-0.54 0.1,-0.34 -0.1,-0.34"
        fill={LIGHT}
        stroke={DARK}
        strokeWidth={0.04}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </>
  );
}

// Маленькая картинка варианта отметки взгляда для выбора в настройках.
function FacingMarkerPreview({ marker }: { marker: FacingMarker }) {
  return (
    <svg
      viewBox="-0.74 -0.74 1.48 1.48"
      width={64}
      height={64}
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <Marks marker={marker} />
    </svg>
  );
}

export default FacingMarkerPreview;
