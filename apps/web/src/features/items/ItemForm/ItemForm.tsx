import { Alert, Button, Grid, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Item } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import ItemFields from './ItemFields';
import ItemImageField from './ItemImageField';
import {
  toFormValues,
  toItemInput,
  type ItemFormValues,
} from './itemFormValues';
import { saveItem } from './saveItem';
import { useImageDraft } from './useImageDraft';
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
  const form = useForm<ItemFormValues>({
    initialValues: toFormValues(item),
    validate: validateItemForm,
  });
  const [draft, setDraft] = useImageDraft(item);
  // Предмет на сервере. При создании он появляется после первого «Сохранить»: если
  // картинка тогда не загрузилась, повторное сохранение правит уже созданный предмет,
  // а не создаёт второй.
  const [saved, setSaved] = useState(item);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = form.onSubmit((values) => {
    setError(null);
    setSubmitting(true);
    saveItem(
      saved?.id ?? null,
      toItemInput(values),
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
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, sm: 'content' }}>
            <ItemImageField
              itemId={saved?.id ?? null}
              itemName={form.values.name}
              draft={draft}
              onChange={setDraft}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 'auto' }}>
            <ItemFields form={form} />
          </Grid.Col>
        </Grid>
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
