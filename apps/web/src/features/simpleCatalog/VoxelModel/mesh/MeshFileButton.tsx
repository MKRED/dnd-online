import { Alert, Button, FileButton, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import { CHARACTER_MODEL_MAX_BYTES, detectModelFormat } from 'shared';
import type { SimpleFormValues } from '../../SimpleEntryForm/simpleEntryValues';
import { newMeshDraft } from './meshDraft';

const MAX_MEGABYTES = CHARACTER_MODEL_MAX_BYTES / (1024 * 1024);

// Выбор файла модели (docs/plan/blocks.md, этап 9): формат — по первым байтам, как на
// сервере. Файл уходит на сервер кнопкой формы, а воксели из него считаются сразу.
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

  const choose = (file: File | null) => {
    if (!file) return;
    setError(null);
    if (file.size > CHARACTER_MODEL_MAX_BYTES) {
      setError(
        `Файл больше ${MAX_MEGABYTES} МБ — упростите модель и попробуйте снова`,
      );
      return;
    }
    // Файл не больше 10 МБ: читаем целиком — у STL формат сверяется с размером файла.
    file
      .arrayBuffer()
      .then((data) => {
        const format = detectModelFormat(new Uint8Array(data));
        if (!format) {
          setError('Не удалось распознать модель. Подойдут .glb и STL');
          return;
        }
        form.setFieldValue('modelMesh', newMeshDraft(file, format));
      })
      .catch((err: unknown) => {
        console.error('Failed to read the model file', err);
        setError('Не удалось прочитать файл');
      });
  };

  return (
    <Stack gap={4}>
      <FileButton
        accept=".glb,.stl,model/gltf-binary,model/stl"
        onChange={choose}
      >
        {(props) => (
          <Button
            {...props}
            size="xs"
            variant={primary ? 'light' : 'default'}
            leftSection={<IconUpload size={16} />}
            w="fit-content"
          >
            {label}
          </Button>
        )}
      </FileButton>
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export default MeshFileButton;
