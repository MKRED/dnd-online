// Цвет блока, который группа видела, но сейчас не видит (docs/plan/done/fog-of-war.md, этап 5):
// почти без цвета и темнее — «как запомнили». Совсем серым не делаем: иначе камень
// и трава в серой зоне не различались бы. Цвета — в линейном пространстве. Блоки
// сереют по той же формуле в шейдере, попиксельно (MapScene/blockMaterial.ts).
export const FOG_KEEP_COLOR = 0.25;
export const FOG_BRIGHTNESS = 0.45;

export function fogColor([r, g, b]: [number, number, number]): [
  number,
  number,
  number,
] {
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const mix = (c: number) =>
    (grey + (c - grey) * FOG_KEEP_COLOR) * FOG_BRIGHTNESS;
  return [mix(r), mix(g), mix(b)];
}
