import type { Texture } from 'three';
import type { CreatureHealth } from 'shared';
import { modelTop, useModel } from '../../models';
import CreatureCard, { creaturePose } from './CreatureCard';
import { useGraphics } from './graphicsContext';
import HealthMark from './HealthMark';
import type { SceneObject, SceneObjectLook } from './objectLayout';

interface CreatureBodyProps {
  object: Pick<SceneObject, 'base' | 'footprint' | 'blocked' | 'top'>;
  look: Extract<SceneObjectLook, { kind: 'creature' }>;
  texture: Texture | null;
  health: CreatureHealth | null | undefined;
  // Метка здоровья над существом; у тени, которую тянут другие, её нет.
  mark: boolean;
}

// Существо на карте: 3D-модель, если она есть, разрешена настройками графики и загрузилась
// (docs/plan/character-models.md), иначе — карточка с картинкой. Пока модель грузится или если она не открылась, стоит
// карточка: существо не пропадает со сцены. Метка здоровья — здесь же: встаёт над тем,
// что стоит на самом деле, а у модели свой рост и своя толщина лёжа.
function CreatureBody({
  object,
  look,
  texture,
  health,
  mark,
}: CreatureBodyProps) {
  const pc = look.side === 'pc';
  // У кого модели — по настройкам графики: у всех, только у отряда (фигурки персонажей
  // игроков) или ни у кого. Без модели файл и не грузится.
  const mode = useGraphics().creatureModels;
  const wanted =
    mode === 'all' || (mode === 'party' && pc) ? (look.model ?? null) : null;
  const state = useModel(wanted?.path ?? null, wanted?.format ?? null);
  const model =
    wanted && state?.status === 'ready'
      ? { model: state.model, fit: wanted.fit, color: wanted.color }
      : null;
  const pose = creaturePose(health, pc);
  // У погибшего и поверженного гроб, а не модель — над ним метка как у карточки.
  const poseHeight =
    model && pose !== 'coffin'
      ? modelTop(model.model.box, object.footprint, model.fit, pose === 'lying')
      : undefined;
  return (
    <>
      <CreatureCard
        object={object}
        look={look}
        texture={texture}
        health={health}
        model={model}
      />
      {mark && health && (
        <HealthMark
          health={health}
          pc={pc}
          base={object.base}
          top={object.top}
          footprint={object.footprint}
          poseHeight={poseHeight}
        />
      )}
    </>
  );
}

export default CreatureBody;
