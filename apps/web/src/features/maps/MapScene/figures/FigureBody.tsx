import type { Texture } from 'three';
import CreatureBody from '../objects/CreatureBody';
import type { SceneFigure } from './figureLayout';

interface FigureBodyProps {
  figure: SceneFigure;
  texture: Texture | null;
  // Метка здоровья над фигуркой; у тени, которую тянут другие, её нет.
  mark?: boolean;
}

// Фигурка персонажа: существо с зелёной рамкой — карточка или 3D-модель персонажа
// (docs/plan/done/character-models.md, этап 3).
function FigureBody({ figure, texture, mark = false }: FigureBodyProps) {
  return (
    <CreatureBody
      object={figure}
      look={{
        kind: 'creature',
        side: 'pc',
        size: figure.size,
        facing: figure.facing,
        image: figure.image,
        letter: figure.letter,
        missing: false,
        model: figure.model ?? null,
      }}
      texture={texture}
      health={figure.health}
      mark={mark}
    />
  );
}

export default FigureBody;
