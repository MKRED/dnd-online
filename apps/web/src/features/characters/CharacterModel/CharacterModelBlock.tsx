import {
  Alert,
  Button,
  FileButton,
  Fieldset,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { lazy, Suspense } from 'react';
import { CHARACTER_MODEL_MAX_BYTES } from 'shared';
import ModelFitControls from './ModelFitControls';
import { useCharacterModel } from './useCharacterModel';

// three — только когда модель есть и блок на экране.
const ModelPreview = lazy(() => import('./ModelPreview'));

const MAX_MB = CHARACTER_MODEL_MAX_BYTES / (1024 * 1024);
// .glb и STL: по типу браузеры их не знают, поэтому и по расширению.
const ACCEPT = '.glb,.stl,model/gltf-binary,model/stl';

const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} КБ`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;

// 3D-модель персонажа (docs/plan/character-models.md, этап 2): с ней на карте стоит
// модель, а не карточка. Как галерея, правится сразу и открыта и во время встречи —
// модель не часть листа.
function CharacterModelBlock({ characterId }: { characterId: string }) {
  const { model, busy, error, upload, remove, change } =
    useCharacterModel(characterId);

  const fileButton = (label: string) => (
    <FileButton accept={ACCEPT} onChange={(file) => file && upload(file)}>
      {(props) => (
        <Button
          {...props}
          variant={model ? 'default' : 'filled'}
          loading={busy === 'upload'}
          disabled={busy !== null && busy !== 'upload' && busy !== 'save'}
        >
          {label}
        </Button>
      )}
    </FileButton>
  );

  return (
    <Fieldset legend="3D-модель">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Модель сохраняется сразу, отдельно от остальной формы. С ней на карте
          персонаж стоит фигуркой, а не карточкой.
          {busy === 'save' && ' Сохраняем…'}
        </Text>
        {model === undefined ? (
          <Loader size="sm" />
        ) : model === null ? (
          <Stack gap="xs" align="flex-start">
            <Text size="sm" c="dimmed">
              Подойдёт .glb (с цветами и текстурами) или STL (одного цвета), до{' '}
              {MAX_MB} МБ.
            </Text>
            {fileButton('Загрузить модель')}
          </Stack>
        ) : (
          <Group align="flex-start" gap="xl">
            <Suspense fallback={<Loader size="sm" />}>
              <ModelPreview characterId={characterId} model={model} />
            </Suspense>
            <Stack gap="sm" style={{ flex: '1 1 260px' }}>
              <Text size="sm" c="dimmed">
                {model.format === 'glb' ? '.glb' : 'STL'} ·{' '}
                {fileSize(model.size)}
              </Text>
              <ModelFitControls model={model} onChange={change} />
              <Group gap="sm">
                {fileButton('Заменить файл')}
                <Button
                  color="red"
                  variant="subtle"
                  loading={busy === 'delete'}
                  disabled={busy === 'upload'}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Удалить 3D-модель? На карте персонаж снова станет карточкой.',
                      )
                    )
                      remove();
                  }}
                >
                  Удалить
                </Button>
              </Group>
            </Stack>
          </Group>
        )}
        {error && (
          <Alert color="red" p="xs">
            {error}
          </Alert>
        )}
      </Stack>
    </Fieldset>
  );
}

export default CharacterModelBlock;
