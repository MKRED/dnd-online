import { getBlock, type Rotation } from 'shared';
import ShapeSwatch from './ShapeSwatch';

interface BlockSwatchProps {
  block: string;
  rotation?: Rotation;
  size?: number;
}

// Миниатюра базового блока по его имени в палитре.
function BlockSwatch({ block, ...props }: BlockSwatchProps) {
  const definition = getBlock(block);
  if (!definition) return null;
  return (
    <ShapeSwatch
      material={definition.material}
      shape={definition.shape}
      {...props}
    />
  );
}

export default BlockSwatch;
