import type { Texture } from 'three';
import { CREATURE_SIZES } from 'shared';
import {
  facingAngle,
  type SceneObject,
  type SceneObjectLook,
} from './objectLayout';
import StandBase, { BLOCKED_COLOR } from './StandBase';
import { useLabelTexture } from './useLabelTexture';

type CreatureLook = Extract<SceneObjectLook, { kind: 'creature' }>;

// Рамка карточки по виду: монстр — красноватая, НПС — синяя, персонаж игрока —
// зелёная, заглушка — серая.
const FRAME = {
  monster: '#9c3b30',
  npc: '#2f63a0',
  pc: '#3d8a4f',
  missing: '#7d848c',
};
const PLINTH = '#2b2622';
// Толщина жетона и высота подставки, в которую он вставлен, — в клетках.
const THICKNESS = 0.05;
const PLINTH_HEIGHT = 0.07;

interface CreatureCardProps {
  object: Pick<SceneObject, 'base' | 'footprint' | 'blocked'>;
  look: CreatureLook;
  // Миниатюра; null — нет картинки или она не загрузилась.
  texture: Texture | null;
}

// Существо — объёмный жетон, как фигурка на игровом поле: толстая карточка в
// подставке, картинка с обеих сторон. К камере не поворачивается: лицом смотрит по
// взгляду существа (туда же, куда стрелка на полу), так поворот виден по самому
// жетону. Высота — рост размера, на полу — подставка во всё место. Без картинки —
// первая буква имени, у заглушки — «?». Подставка на полу круглая, как у миниатюры.
function CreatureCard({ object, look, texture }: CreatureCardProps) {
  const frame = look.missing ? FRAME.missing : FRAME[look.side];
  const letter = useLabelTexture(texture ? null : look.letter, frame);
  const width = object.footprint * 0.9;
  const height = CREATURE_SIZES[look.size].height * 0.95;
  const picture = width * 0.9;
  // Картинка — квадрат в верхней части карточки; поля миниатюры каталога прозрачные,
  // сквозь них видна рамка.
  const pictureY = height - width / 2;
  const face = THICKNESS / 2 + 0.002;
  const image = <meshBasicMaterial map={texture ?? letter} alphaTest={0.05} />;
  return (
    <group position={object.base}>
      <StandBase
        size={object.footprint}
        color={object.blocked ? BLOCKED_COLOR : frame}
        facing={look.facing}
        round
      />
      {/* В повёрнутой группе взгляд — локальный −z: туда смотрит лицевая сторона. */}
      <group rotation={[0, facingAngle(look.facing), 0]}>
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, THICKNESS]} />
          <meshStandardMaterial color={frame} />
        </mesh>
        <mesh position={[0, pictureY, -face]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[picture, picture]} />
          {image}
        </mesh>
        <mesh position={[0, pictureY, face]}>
          <planeGeometry args={[picture, picture]} />
          {image}
        </mesh>
        <mesh position={[0, PLINTH_HEIGHT / 2, 0]}>
          <boxGeometry
            args={[width * 0.8, PLINTH_HEIGHT, 0.18 * object.footprint]}
          />
          <meshStandardMaterial color={PLINTH} />
        </mesh>
      </group>
    </group>
  );
}

export default CreatureCard;
