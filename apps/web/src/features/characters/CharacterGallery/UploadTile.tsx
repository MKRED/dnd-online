import { Text } from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { CHARACTER_IMAGE_MAX_BYTES, CHARACTER_IMAGE_MIME_TYPES } from 'shared';
import classes from './CharacterGallery.module.css';
import type { UploadProblem } from './useCharacterImages';

const MAX_MEGABYTES = CHARACTER_IMAGE_MAX_BYTES / (1024 * 1024);

// Причина отказа на русском: коды приходят от react-dropzone, тексты у него английские.
function rejectionMessage({ errors }: FileRejection): string {
  const codes = errors.map((error) => error.code);
  if (codes.includes('file-too-large')) return `больше ${MAX_MEGABYTES} МБ`;
  if (codes.includes('file-invalid-type')) {
    return 'не тот формат — подойдут JPEG, PNG и WebP';
  }
  return 'не удалось добавить';
}

interface UploadTileProps {
  // В пустой галерее зона растянута на всю строку.
  wide: boolean;
  loading: boolean;
  onFiles: (files: File[]) => void;
  onProblems: (problems: UploadProblem[]) => void;
}

function UploadTile({ wide, loading, onFiles, onProblems }: UploadTileProps) {
  return (
    <Dropzone
      className={`${classes.uploadTile} ${wide ? classes.uploadWide : ''}`}
      accept={[...CHARACTER_IMAGE_MIME_TYPES]}
      maxSize={CHARACTER_IMAGE_MAX_BYTES}
      loading={loading}
      onDrop={onFiles}
      onReject={(rejections) =>
        onProblems(
          rejections.map((rejection) => ({
            fileName: rejection.file.name,
            message: rejectionMessage(rejection),
          })),
        )
      }
      aria-label="Добавить картинки"
    >
      <Text size="sm" fw={500}>
        {wide ? 'Перетащите картинки сюда или нажмите' : 'Добавить'}
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        JPEG, PNG, WebP · до {MAX_MEGABYTES} МБ
      </Text>
    </Dropzone>
  );
}

export default UploadTile;
