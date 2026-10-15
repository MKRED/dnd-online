import { Alert, Button, Grid, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Item } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import { ImageField, useImageDraft } from '../../catalog';
import { itemImagePath } from '../itemsApi';
import ItemFields from './ItemFields';
import {
  toFormValues,
  toItemInput,
  type ItemFormValues,
} from './itemFormValues';
import SaveConfirm from './SaveConfirm';
import {
  saveConfirmation,
  type SaveConfirmation,
  type SaveFlags,
} from './saveConfirmation';
import { saveItem } from './saveItem';
import { validateItemForm } from './validateItemForm';

interface ItemFormProps {
  // null — создание нового предмета.
  item: Item | null;
  submitLabel: string;
  cancelTo: string;
  onSaved: (item: Item) => void;
}

// Форма предмета: поля и картинка сохраняются одной кнопкой.
function ItemForm({ item, submitLabel, cancelTo, onSaved }: ItemFormProps) {
  // Вопрос перед сохранением (публикация состава, скрытие наборов). Любая правка формы
  // его снимает: ответ относился к прежним значениям.
  const [confirmation, setConfirmation] = useState<SaveConfirmation | null>(
    null,
  );
  const form = useForm<ItemFormValues>({
    initialValues: toFormValues(item),
    validate: validateItemForm,
    onValuesChange: () => setConfirmation(null),
  });
  const [draft, setDraft] = useImageDraft(item?.image ?? null);
  // Предмет на сервере. При создании он появляется после первого «Сохранить»: если
  // картинка тогда не загрузилась, повторное сохранение правит уже созданный предмет,
  // а не создаёт второй.
  const [saved, setSaved] = useState(item);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const save = (values: ItemFormValues, flags: SaveFlags) => {
    setConfirmation(null);
    setError(null);
    setSubmitting(true);
    saveItem(
      saved?.id ?? null,
      { ...toItemInput(values), ...flags },
      draft,
      saved?.image ?? null,
    )
      .then(({ item: result, imageError }) => {
        if (!imageError) {
          onSaved(result);
          return;
        }
        setSaved(result);
        setError(
          `Предмет сохранён, а картинка — нет: ${imageError}. Нажмите «${submitLabel}», чтобы попробовать ещё раз.`,
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to save item', err);
        setError(errorMessage(err, 'Не удалось сохранить предмет'));
      })
      .finally(() => setSubmitting(false));
  };

  const handleSubmit = form.onSubmit((values) => {
    const question = saveConfirmation(values, saved);
    if (question) setConfirmation(question);
    else save(values, {});
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, sm: 'content' }}>
            <ImageField
              entryId={saved?.id ?? null}
              entryName={form.values.name}
              imagePath={itemImagePath}
              draft={draft}
              onChange={setDraft}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 'auto' }}>
            <ItemFields form={form} itemId={saved?.id ?? null} />
          </Grid.Col>
        </Grid>
        {confirmation && (
          <SaveConfirm
            confirmation={confirmation}
            // Значения уже проверены: форма с вопросом не менялась.
            onConfirm={(flags) => save(form.getValues(), flags)}
            onCancel={() => setConfirmation(null)}
          />
        )}
        {error && (
          <Alert color="red" title="Ошибка сохранения">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button component={Link} to={cancelTo} variant="default">
            Отмена
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default ItemForm;
