import classes from './Equipment.module.css';

// Силуэт в центре куклы, когда у персонажа нет 3D-модели.
function Silhouette() {
  return (
    <svg
      className={classes.silhouette}
      width="150"
      height="240"
      viewBox="0 0 190 300"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="95" cy="38" r="26" />
      <path d="M60 78 Q95 66 130 78 L146 170 L132 172 L124 120 L122 196 L134 290 L108 290 L95 206 L82 290 L56 290 L68 196 L66 120 L58 172 L44 170 Z" />
    </svg>
  );
}

export default Silhouette;
