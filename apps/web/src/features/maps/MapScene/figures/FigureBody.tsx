import type { Texture } from 'three';
import { useModel } from '../../models';
import CreatureCard from '../objects/CreatureCard';
import type { SceneFigure } from './figureLayout';

interface FigureBodyProps {
  figure: SceneFigure;
  texture: Texture | null;
}

// Фигурка персонажа: 3D-модель, если она есть и загрузилась (docs/plan/character-models.md,
// этап 3), иначе — карточка с картинкой. Пока модель грузится или если она не
// открылась, стоит карточка: фигурка не пропадает со сцены.
function FigureBody({ figure, texture }: FigureBodyProps) {
  const state = useModel(
    figure.model?.path ?? null,
    figure.model?.format ?? null,
  );
  const model =
    figure.model && state?.status === 'ready'
      ? { model: state.model, fit: figure.model.fit, color: figure.model.color }
      : null;
  return (
    <CreatureCard
      object={figure}
      look={{
        kind: 'creature',
        side: 'pc',
        size: figure.size,
        facing: figure.facing,
        image: figure.image,
        letter: figure.letter,
        missing: false,
      }}
      texture={texture}
      health={figure.health}
      model={model}
    />
  );
}

export default FigureBody;
