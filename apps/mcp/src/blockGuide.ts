import { MATERIALS, SHAPE_LABELS, SHAPE_NAMES, SHAPES } from 'shared';

// Справка для модели: как устроены координаты, какие есть блоки и операции.
// Собирается из shared, чтобы не расходиться с тем, что реально принимает сервер.
export function buildBlockGuide(): string {
  const materials = Object.entries(MATERIALS).map(([name, m]) => {
    const traits = [
      m.opaque ? 'непрозрачный' : 'прозрачный',
      m.durability
        ? `КД ${m.durability.armorClass}, ХП ${m.durability.hitPoints}`
        : 'не разрушается атаками',
      m.flammable ? 'горит' : null,
      m.movementCost === 2 ? 'труднопроходимый' : null,
    ].filter(Boolean);
    return `- ${name} — ${m.label} (${traits.join(', ')})`;
  });
  const shapes = SHAPE_NAMES.map(
    (shape) =>
      `- ${shape} — ${SHAPE_LABELS[shape]}; коробки ${JSON.stringify(SHAPES[shape])}`,
  );

  return [
    'КООРДИНАТЫ',
    '- Клетка [x, y, z], целые числа, 1 клетка = 5 футов. y — высота. Север — -z, юг — +z, запад — -x, восток — +x.',
    '- Карта растущая, отрицательные координаты допустимы.',
    '- Этаж — обычно 2 блока высоты (10 футов). На блоке уровня y стоят на уровне y+1.',
    '',
    'ИМЕНА БЛОКОВ',
    '- Куб — имя материала (stone), другие фигуры — материал_фигура (stone_stairs, wood_slab_top). «air» — воздух, им очищают клетки.',
    '',
    'МАТЕРИАЛЫ',
    ...materials,
    '',
    'ФИГУРЫ (коробки внутри клетки: [minX, minY, minZ, maxX, maxY, maxZ] от 0 до 1, при повороте 0)',
    ...shapes,
    '- Поворот rotation: 0, 90, 180, 270 — по часовой стрелке при виде сверху. При 0 стена стоит у северного края клетки, ступени поднимаются к югу; 90 — стена у восточного края, ступени к западу; 180 — у южного, к северу; 270 — у западного, к востоку.',
    '',
    'ОПЕРАЦИИ (apply_ops принимает список, применяется целиком или не применяется вовсе, откатывается одним undo)',
    '- setBlock {at, block, rotation?}',
    '- fillBox {from, to, block, rotation?} — залить область (углы в любом порядке)',
    '- hollowBox {from, to, block, rotation?} — оболочка области (стены, пол и потолок), внутри — воздух',
    '- replace {from, to, match, block, rotation?} — заменить в области блоки match на block',
  ].join('\n');
}
