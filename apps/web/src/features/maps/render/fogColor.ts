// Цвет блока, который группа видела, но сейчас не видит (docs/plan/fog-of-war.md, этап 5):
// почти без цвета и темнее — «как запомнили». Совсем серым не делаем: иначе камень
// и трава в серой зоне не различались бы. Цвета вершин — в линейном пространстве.
const KEEP_COLOR = 0.25;
const BRIGHTNESS = 0.45;

export function fogColor([r, g, b]: [number, number, number]): [
  number,
  number,
  number,
] {
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const mix = (c: number) => (grey + (c - grey) * KEEP_COLOR) * BRIGHTNESS;
  return [mix(r), mix(g), mix(b)];
}
