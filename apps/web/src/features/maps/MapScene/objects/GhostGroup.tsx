import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Color, Group, Material, Mesh } from 'three';
import { fogColor } from '../../render/fogColor';

// Во сколько раз прозрачнее обычного рисуется скрытый объект.
const GHOST_OPACITY = 0.4;

// Скрытый от игроков объект мастер видит полупрозрачным (docs/plan/done/game.md, этап 6).
// Материалы объекта разбросаны по его компонентам (карточка, подставка, контейнер),
// поэтому прозрачность ставится обходом готовой группы после каждой отрисовки, а не
// пропсом в каждый материал. Исходная прозрачность — в userData, чтобы повторный обход
// не делал объект всё прозрачнее. Снятый флажок пересоздаёт объект (key в ObjectLayer),
// и материалы приходят чистыми.
// Тем же обходом предмет в серой зоне тумана темнеет (dim): у каждого материала свой
// цвет, и пропс в каждый компонент объекта не протянуть.
function GhostGroup({
  active,
  dim = false,
  children,
}: {
  // false — обычный объект, группа ничего не меняет.
  active: boolean;
  dim?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!active && !dim) return;
    ref.current?.traverse((node) => {
      const { material } = node as Partial<Mesh>;
      if (!material) return;
      for (const item of Array.isArray(material) ? material : [material]) {
        if (active) ghost(item);
        if (dim) darken(item);
      }
    });
  });
  return <group ref={ref}>{children}</group>;
}

function ghost(material: Material) {
  const data = material.userData as { ghostBase?: number };
  data.ghostBase ??= material.opacity;
  const opacity = data.ghostBase * GHOST_OPACITY;
  if (material.opacity === opacity && material.transparent) return;
  material.transparent = true;
  material.opacity = opacity;
  // Полупрозрачное не закрывает то, что за ним: иначе блоки за призраком пропадали бы.
  material.depthWrite = false;
  material.needsUpdate = true;
}

// Предмет, который группа видела, но сейчас не видит (туман войны,
// docs/plan/done/fog-of-war.md, этап 5), красится как серые блоки вокруг него (fogColor).
// Исходный цвет — в userData: повторный обход не делает предмет всё темнее.
function darken(material: Material) {
  const { color } = material as Material & { color?: Color };
  if (!color) return;
  const data = material.userData as { dimBase?: Color };
  data.dimBase ??= color.clone();
  const [r, g, b] = fogColor([data.dimBase.r, data.dimBase.g, data.dimBase.b]);
  if (color.r === r && color.g === g && color.b === b) return;
  color.setRGB(r, g, b);
}

export default GhostGroup;
