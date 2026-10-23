import { Modal } from '@mantine/core';
import { useState } from 'react';
import type { VoxelModelFields } from 'shared';
import VoxelEditorBody from './VoxelEditorBody';

export interface VoxelEditorModalProps {
  // null — окно закрыто.
  model: VoxelModelFields | null;
  title: string;
  onDone: (model: VoxelModelFields) => void;
  onClose: () => void;
}

// Воксельный редактор поверх формы (docs/plan/blocks.md, этап 8а) — на весь экран:
// 3D-холсту нужно место. «Готово» кладёт модель в форму, сохраняет её кнопка формы.
// Модуль грузится лениво: three не должен попасть в общий бандл.
function VoxelEditorModal({
  model,
  title,
  onDone,
  onClose,
}: VoxelEditorModalProps) {
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
      opened={model !== null}
      onClose={requestClose}
      title={title}
      fullScreen
    >
      {model && (
        <VoxelEditorBody
          model={model}
          confirmClose={confirmClose}
          onDirty={setDirty}
          onKeepEditing={() => setConfirmClose(false)}
          onCancel={requestClose}
          onDiscard={close}
          onDone={(result) => {
            onDone(result);
            close();
          }}
        />
      )}
    </Modal>
  );
}

export default VoxelEditorModal;
