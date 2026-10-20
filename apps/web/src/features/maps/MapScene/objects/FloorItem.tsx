import type { Texture } from 'three';
import type { SceneObject, SceneObjectLook } from './objectLayout';
import { useLabelTexture } from './useLabelTexture';

type ItemLook = Extract<SceneObjectLook, { kind: 'item' }>;

const FRAME = { found: '#b8892e', missing: '#7d848c' };

// Предмет на полу — маленькая карточка с миниатюрой, лежащая на полу.
function FloorItem({
  object,
  look,
  texture,
}: {
  object: SceneObject;
  look: ItemLook;
  texture: Texture | null;
}) {
  const frame = look.missing ? FRAME.missing : FRAME.found;
  const letter = useLabelTexture(texture ? null : look.letter, frame);
  return (
    <group position={object.base} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh position={[0, 0, 0.04]} raycast={() => null}>
        <planeGeometry args={[0.56, 0.56]} />
        <meshBasicMaterial map={texture ?? letter} alphaTest={0.05} />
      </mesh>
    </group>
  );
}

export default FloorItem;
