import { Alert, Button, Group, Loader, Text } from '@mantine/core';
import type { CompressProgress, CompressStats } from './compressLimits';
import type { CompressState } from './useModelCompression';

const megabytes = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;

// «1,2 млн», «180 тыс.», «950».
const triangles = (count: number) =>
  count >= 1_000_000
    ? `${(count / 1_000_000).toFixed(1).replace('.', ',')} млн`
    : count >= 1000
      ? `${Math.round(count / 1000)} тыс.`
      : String(count);

const stats = (s: CompressStats) =>
  `${megabytes(s.bytes)} · ${triangles(s.triangles)} треугольников`;

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
}

// Сжатие тяжёлой модели в блоке «3D-модель»: предложение, ход, итог или отказ.
function CompressPanel({ state, onCompress, onCancel }: CompressPanelProps) {
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
              Сжать и загрузить
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
          Сжато: было {stats(state.before)} → стало {stats(state.after)}.
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
