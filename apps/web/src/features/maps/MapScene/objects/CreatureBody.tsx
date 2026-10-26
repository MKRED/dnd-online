import { useMemo } from 'react';
import type { Texture } from 'three';
import type { CreatureHealth } from 'shared';
import { modelTop, useModel } from '../../models';
import { voxelFigureData } from '../../../voxelModels/voxelBounds';
import CreatureCard, { creaturePose, type CardModel } from './CreatureCard';
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
// (docs/plan/done/character-models.md), иначе — карточка с картинкой. Пока модель грузится или если она не открылась, стоит
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
  const file = wanted?.kind === 'file' ? wanted : null;
  const state = useModel(file?.path ?? null, file?.format ?? null);
  // Рисованную модель монстра (docs/plan/done/monster-models.md) грузить не нужно: воксели уже
  // в справочнике объектов. Пустая — карточка.
  const voxels = useMemo(
    () => (wanted?.kind === 'voxels' ? voxelFigureData(wanted.fields) : null),
    [wanted],
  );
  const model: CardModel | null =
    file && state?.status === 'ready'
      ? { kind: 'file', model: state.model, fit: file.fit, color: file.color }
      : wanted?.kind === 'voxels' && voxels
        ? { kind: 'voxels', data: voxels, fit: wanted.fit }
        : null;
  const pose = creaturePose(health, pc);
  // У погибшего и поверженного гроб, а не модель — над ним метка как у карточки.
  const poseHeight =
    model && pose !== 'coffin'
      ? modelTop(
          model.kind === 'file' ? model.model.box : model.data.box,
          object.footprint,
          model.fit,
          pose === 'lying',
        )
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
