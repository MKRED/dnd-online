import type { Texture } from 'three';
import { modelTop, useModel } from '../../models';
import CreatureCard, { creaturePose } from '../objects/CreatureCard';
import HealthMark from '../objects/HealthMark';
import type { SceneFigure } from './figureLayout';

interface FigureBodyProps {
  figure: SceneFigure;
  texture: Texture | null;
  // Метка здоровья над фигуркой; у тени, которую тянут другие, её нет.
  mark?: boolean;
}

// Фигурка персонажа: 3D-модель, если она есть и загрузилась (docs/plan/character-models.md,
// этап 3), иначе — карточка с картинкой. Пока модель грузится или если она не
// открылась, стоит карточка: фигурка не пропадает со сцены. Метка здоровья — здесь же:
// встаёт над тем, что стоит на самом деле, а у модели свой рост и своя толщина лёжа.
function FigureBody({ figure, texture, mark = false }: FigureBodyProps) {
  const state = useModel(
    figure.model?.path ?? null,
    figure.model?.format ?? null,
  );
  const model =
    figure.model && state?.status === 'ready'
      ? { model: state.model, fit: figure.model.fit, color: figure.model.color }
      : null;
  const pose = creaturePose(figure.health, true);
  // У погибшего гроб, а не модель — над ним метка как у карточки.
  const poseHeight =
    model && pose !== 'coffin'
      ? modelTop(model.model.box, figure.footprint, model.fit, pose === 'lying')
      : undefined;
  return (
    <>
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
      {mark && figure.health && (
        <HealthMark
          health={figure.health}
          pc
          base={figure.base}
          top={figure.top}
          footprint={figure.footprint}
          poseHeight={poseHeight}
        />
      )}
    </>
  );
}

export default FigureBody;
