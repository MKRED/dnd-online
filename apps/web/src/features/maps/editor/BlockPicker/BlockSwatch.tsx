import type { Rotation } from 'shared';
import { useBlockCatalog } from './catalogContext';
import ShapeSwatch from './ShapeSwatch';

interface BlockSwatchProps {
  block: string;
  rotation?: Rotation;
  size?: number;
}

// Миниатюра блока по его имени в палитре: базового или своего — с видом группы
// (docs/plan/blocks.md, этап 6а).
function BlockSwatch({ block, ...props }: BlockSwatchProps) {
  const info = useBlockCatalog().describe(block);
  if (!info) return null;
  return (
    <ShapeSwatch
      material={info.material}
      shape={info.shape}
      color={info.traits.color}
      textures={info.textures}
      {...props}
    />
  );
}

export default BlockSwatch;
