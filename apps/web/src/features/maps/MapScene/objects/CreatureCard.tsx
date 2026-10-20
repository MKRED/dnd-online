import type { Texture } from 'three';
import { CREATURE_SIZES } from 'shared';
import FaceCamera from './FaceCamera';
import type { SceneObject, SceneObjectLook } from './objectLayout';
import StandBase, { BLOCKED_COLOR } from './StandBase';
import { useLabelTexture } from './useLabelTexture';

type CreatureLook = Extract<SceneObjectLook, { kind: 'creature' }>;

// Рамка карточки по виду: монстр — красноватая, НПС — синяя, заглушка — серая.
const FRAME = { monster: '#9c3b30', npc: '#2f63a0', missing: '#7d848c' };

interface CreatureCardProps {
  object: SceneObject;
  look: CreatureLook;
  // Миниатюра; null — нет картинки или она не загрузилась.
  texture: Texture | null;
}

// Существо — стоячая карточка с миниатюрой, всегда повёрнутая к камере (вращается
// только вокруг вертикали). Высота — рост размера, на полу — подставка во всё место и
// стрелка взгляда. Без картинки — первая буква имени, у заглушки — «?».
function CreatureCard({ object, look, texture }: CreatureCardProps) {
  const frame = look.missing ? FRAME.missing : FRAME[look.side];
  const letter = useLabelTexture(texture ? null : look.letter, frame);
  const width = object.footprint * 0.9;
  const height = CREATURE_SIZES[look.size].height * 0.95;
  const picture = width * 0.9;
  return (
    <group position={object.base}>
      <StandBase
        size={object.footprint}
        color={object.blocked ? BLOCKED_COLOR : frame}
        facing={look.facing}
      />
      <FaceCamera position={[0, height / 2, 0]}>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color={frame} />
        </mesh>
        {/* Картинка — квадрат в верхней части карточки; поля миниатюры каталога
            прозрачные, сквозь них видна рамка. */}
        <mesh position={[0, height / 2 - width / 2, 0.01]}>
          <planeGeometry args={[picture, picture]} />
          <meshBasicMaterial map={texture ?? letter} alphaTest={0.05} />
        </mesh>
      </FaceCamera>
    </group>
  );
}

export default CreatureCard;
