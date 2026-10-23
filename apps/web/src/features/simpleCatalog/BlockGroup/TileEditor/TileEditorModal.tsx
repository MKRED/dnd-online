import { Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import type { BlockTextures, MaterialName } from 'shared';
import type { TextureFace, TextureMode } from '../blockTextureForm';
import TileEditorBody from './TileEditorBody';

export interface TileEditorTarget {
  face: TextureFace;
  mode: TextureMode;
  title: string;
}

export interface TileEditorModalProps {
  target: TileEditorTarget | null;
  textures: BlockTextures | null;
  look: MaterialName;
  color: string;
  onDone: (face: TextureFace, tile: string) => void;
  onClose: () => void;
}

// Пиксельный редактор плитки поверх формы блока (docs/plan/blocks.md, этап 5).
// «Готово» кладёт плитку в форму, сохраняет её уже кнопка формы.
function TileEditorModal(props: TileEditorModalProps) {
  const { target, textures, onClose } = props;
  const narrow = useMediaQuery('(max-width: 48em)');
  const [confirmClose, setConfirmClose] = useState(false);
  const [dirty, setDirty] = useState(false);

  const close = () => {
    setConfirmClose(false);
    setDirty(false);
    onClose();
  };
  // Закрытие крестиком, Esc или «Отменой» с правками сначала спрашивает.
  const requestClose = () => (dirty ? setConfirmClose(true) : close());

  return (
    <Modal
      opened={target !== null && textures !== null}
      onClose={requestClose}
      title={target?.title}
      size="56rem"
      fullScreen={narrow}
    >
      {target && textures && (
        <TileEditorBody
          {...props}
          target={target}
          textures={textures}
          confirmClose={confirmClose}
          onDirty={setDirty}
          onKeepDrawing={() => setConfirmClose(false)}
          onCancel={requestClose}
          onDiscard={close}
          onDone={(face, tile) => {
            props.onDone(face, tile);
            close();
          }}
        />
      )}
    </Modal>
  );
}

export default TileEditorModal;
