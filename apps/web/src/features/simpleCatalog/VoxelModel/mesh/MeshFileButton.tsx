import { Alert, Button, FileButton, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import { detectModelFormat } from 'shared';
import {
  CompressPanel,
  useModelCompression,
  type CompressResult,
} from '../../../modelCompress';
import type { SimpleFormValues } from '../../SimpleEntryForm/simpleEntryValues';
import { newMeshDraft } from './meshDraft';

// Выбор файла модели (docs/plan/blocks.md, этап 9): формат — по первым байтам, как на
// сервере. Файл уходит на сервер кнопкой формы, а воксели из него считаются сразу. Файл
// от 10 до 100 МБ сначала сжимается в браузере, как у персонажа (docs/plan/done/monster-models.md,
// этап 3); пока он сжимается, форма не сохраняется (meshCompressing).
function MeshFileButton({
  form,
  label,
  primary = false,
}: {
  form: UseFormReturnType<SimpleFormValues>;
  label: string;
  primary?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  // Файл не больше 10 МБ: читаем целиком — у STL формат сверяется с размером файла.
  const accept = (file: File, compressed?: CompressResult) => {
    form.setFieldValue('meshCompressing', false);
    file
      .arrayBuffer()
      .then((data) => {
        const format = detectModelFormat(new Uint8Array(data));
        if (!format) {
          setError('Не удалось распознать модель. Подойдут .glb и STL');
          return;
        }
        form.setFieldValue('modelMesh', newMeshDraft(file, format, compressed));
      })
      .catch((err: unknown) => {
        console.error('Failed to read the model file', err);
        setError('Не удалось прочитать файл');
      });
  };
  // Сжатие сбилось — форма снова сохраняется, даже если отказ ещё не закрыли.
  const compression = useModelCompression(accept, () =>
    form.setFieldValue('meshCompressing', false),
  );
  const compressing = compression.state.kind === 'working';

  const compress = () => {
    form.setFieldValue('meshCompressing', true);
    form.clearFieldError('meshCompressing');
    compression.compress();
  };
  const cancel = () => {
    form.setFieldValue('meshCompressing', false);
    compression.cancel();
  };

  return (
    <Stack gap={4}>
      <FileButton
        accept=".glb,.stl,model/gltf-binary,model/stl"
        onChange={(file) => {
          if (!file) return;
          setError(null);
          compression.choose(file);
        }}
      >
        {(props) => (
          <Button
            {...props}
            size="xs"
            variant={primary ? 'light' : 'default'}
            leftSection={<IconUpload size={16} />}
            w="fit-content"
            loading={compressing}
            disabled={compression.state.kind === 'offer'}
          >
            {label}
          </Button>
        )}
      </FileButton>
      {/* Итог сжатия показывает сам файл в форме (MeshFields): эта кнопка у нового файла
          пропадает. */}
      {compression.state.kind !== 'done' && (
        <CompressPanel
          state={compression.state}
          onCompress={compress}
          onCancel={cancel}
          compressLabel="Сжать"
        />
      )}
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export default MeshFileButton;
