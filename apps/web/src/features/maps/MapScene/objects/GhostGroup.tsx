import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Group, Material, Mesh } from 'three';

// Во сколько раз прозрачнее обычного рисуется скрытый объект.
const GHOST_OPACITY = 0.4;

// Скрытый от игроков объект мастер видит полупрозрачным (docs/plan/game.md, этап 6).
// Материалы объекта разбросаны по его компонентам (карточка, подставка, контейнер),
// поэтому прозрачность ставится обходом готовой группы после каждой отрисовки, а не
// пропсом в каждый материал. Исходная прозрачность — в userData, чтобы повторный обход
// не делал объект всё прозрачнее. Снятый флажок пересоздаёт объект (key в ObjectLayer),
// и материалы приходят чистыми.
function GhostGroup({
  active,
  children,
}: {
  // false — обычный объект, группа ничего не меняет.
  active: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!active) return;
    ref.current?.traverse((node) => {
      const { material } = node as Partial<Mesh>;
      if (!material) return;
      for (const item of Array.isArray(material) ? material : [material]) {
        ghost(item);
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

export default GhostGroup;
