import { Alert, Button, Group, Loader, Text } from '@mantine/core';
import type { CompressProgress } from './compressLimits';
import { compressedText, megabytes } from './compressText';
import type { CompressState } from './useModelCompression';

const progressText = (progress: CompressProgress | null) =>
  !progress || progress.stage === 'read'
    ? 'Читаю файл…'
    : progress.stage === 'textures'
      ? 'Уменьшаю текстуры…'
      : `Упрощаю геометрию: проход ${progress.pass} из ${progress.passes}…`;

interface CompressPanelProps {
  state: CompressState;
  onCompress: () => void;
  onCancel: () => void;
  // Кнопка согласия: у персонажа файл сразу загружается, в «Моделях» — по «Сохранить».
  compressLabel?: string;
}

// Сжатие тяжёлой модели: предложение, ход, итог или отказ — в блоке «3D-модель» персонажа
// и у файла модели в «Моделях».
function CompressPanel({
  state,
  onCompress,
  onCancel,
  compressLabel = 'Сжать и загрузить',
}: CompressPanelProps) {
  switch (state.kind) {
    case 'idle':
      return null;
    case 'offer':
      return (
        <Alert color="yellow" title="Файл больше 10 МБ" p="sm">
          <Text size="sm" mb="sm">
            «{state.file.name}» весит {megabytes(state.file.size)}. Сожмём его
            до ~9 МБ прямо в браузере: упростим геометрию и уменьшим текстуры.
            Форма модели сохранится, мелкие детали могут сгладиться.
          </Text>
          <Group gap="sm">
            <Button size="xs" onClick={onCompress}>
              {compressLabel}
            </Button>
            <Button size="xs" variant="default" onClick={onCancel}>
              Отмена
            </Button>
          </Group>
        </Alert>
      );
    case 'working':
      return (
        <Group gap="sm" wrap="nowrap">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            {progressText(state.progress)}
          </Text>
        </Group>
      );
    case 'done':
      return (
        <Text size="sm" c="dimmed">
          {compressedText(state)}
        </Text>
      );
    case 'error':
      return (
        <Alert color="red" p="xs" withCloseButton onClose={onCancel}>
          {state.message}
        </Alert>
      );
  }
}

export default CompressPanel;
