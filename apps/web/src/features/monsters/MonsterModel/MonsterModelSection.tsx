import {
  Alert,
  Anchor,
  Center,
  Fieldset,
  Grid,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CREATURE_SIZES,
  MONSTER_SIZE_LABELS,
  type MonsterModelLink,
  type MonsterSize,
  type VoxelModel,
} from 'shared';
import { storedMeshPath, useOwnModels } from '../../voxelModels';
import type { MonsterFormValues } from '../MonsterForm/monsterFormValues';
import { useWatched } from '../MonsterForm/useWatched';
import ModelScaleSlider from './ModelScaleSlider';
import MonsterModelPicker from './MonsterModelPicker';

// three — только когда модель выбрана.
const MonsterModelPreview = lazy(() => import('./MonsterModelPreview'));

const PREVIEW = 260;

// Раздел «3D-модель на карте» формы монстра (docs/plan/done/monster-models.md, этап 4, вариант
// Б макета): превью с ростовой доской, выбор своей модели из «Моделей», загрузка файла,
// рисование и правка, поправка размера. Модель сохраняется в «Модели» сразу, ссылку —
// кнопка формы.
function MonsterModelSection({
  form,
}: {
  form: UseFormReturnType<MonsterFormValues>;
}) {
  const own = useOwnModels({ refreshOnFocus: true });
  const link = useWatched<MonsterModelLink | null>(
    form,
    'model',
    (values) => values.model,
  );
  const size = useWatched<MonsterSize>(form, 'size', (values) => values.size);
  const footprint = CREATURE_SIZES[size].footprint;
  const selected = own.models?.find((entry) => entry.id === link?.id) ?? null;
  // Модель из ссылки удалена из «Моделей»: сервер такую ссылку не сохранит — снимаем её
  // и говорим об этом, пока не выбрана другая.
  const [startId] = useState(() => form.getValues().model?.id ?? null);
  const lost =
    !link &&
    startId !== null &&
    own.models !== null &&
    !own.models.some((entry) => entry.id === startId);
  useEffect(() => {
    if (own.models && link && !selected) form.setFieldValue('model', null);
  }, [own.models, link, selected, form]);

  const choose = (model: VoxelModel) => {
    form.setFieldValue('model', { id: model.id, scale: link?.scale ?? 1 });
  };

  return (
    <Fieldset legend="3D-модель на карте">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, sm: 'content' }}>
          <Center>
            {selected && link ? (
              <Suspense fallback={<Center w={PREVIEW} h={PREVIEW} />}>
                <MonsterModelPreview
                  model={{ ...selected, scale: link.scale }}
                  path={storedMeshPath}
                  footprint={footprint}
                  size={PREVIEW}
                  guides
                />
              </Suspense>
            ) : (
              <Center
                w={PREVIEW}
                h={PREVIEW}
                bd="1px dashed var(--mantine-color-default-border)"
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              >
                <Text size="sm" c="dimmed" ta="center" px="md">
                  Без модели на карте стоит карточка с картинкой
                </Text>
              </Center>
            )}
          </Center>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 'auto' }}>
          <Stack gap="sm">
            <MonsterModelPicker
              own={own}
              selected={selected}
              footprint={footprint}
              newName={() => form.getValues().name.trim() || 'Модель монстра'}
              onChoose={choose}
              onRemove={() => form.setFieldValue('model', null)}
            />
            {lost && (
              <Alert color="yellow" p="xs">
                Прежняя модель удалена из «Моделей» — выберите другую или
                оставьте карточку.
              </Alert>
            )}
            {link && (
              <ModelScaleSlider
                value={link.scale}
                onChange={(scale) =>
                  form.setFieldValue('model', { ...link, scale })
                }
              />
            )}
            <Text size="xs" c="dimmed">
              Модель сама вписывается в место размера «
              {MONSTER_SIZE_LABELS[size]}» ({Math.max(1, footprint)}×
              {Math.max(1, footprint)} кл.); ползунок — поправка. Поворот, верх
              файла и цвет STL правятся у самой модели. Свойства её клеток у
              монстра не действуют.
            </Text>
            <Text size="xs" c="dimmed">
              Только свои модели: чужую сначала скопируйте в{' '}
              <Anchor
                component={Link}
                to="/models?tab=catalog"
                target="_blank"
                size="xs"
              >
                «Модели»
              </Anchor>
              . Загруженный файл или нарисованная модель сразу сохраняются туда
              под именем монстра.
            </Text>
            {own.error && (
              <Alert color="red" p="xs">
                {own.error}
              </Alert>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default MonsterModelSection;
