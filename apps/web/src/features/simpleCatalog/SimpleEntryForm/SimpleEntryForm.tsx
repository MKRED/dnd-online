import {
  Alert,
  Button,
  Grid,
  Group,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../../lib/apiRequest';
import {
  ImageField,
  saveWithImage,
  SourcesField,
  useImageDraft,
} from '../../catalog';
import SaveConfirm, {
  type SaveConfirmation,
  type SaveFlags,
} from '../SaveConfirm';
import type { SimpleCatalogDef, SimpleEntry } from '../simpleCatalogs';
import {
  simpleFormValidate,
  toSimpleFormValues,
  toSimpleInput,
  type SimpleFormValues,
} from './simpleEntryValues';

interface SimpleEntryFormProps {
  def: SimpleCatalogDef;
  // null — создание новой записи.
  entry: SimpleEntry | null;
  submitLabel: string;
  cancelTo: string;
  onSaved: (entry: SimpleEntry) => void;
}

// Форма способности или эффекта: поля и картинка сохраняются одной кнопкой, как у
// предметов.
function SimpleEntryForm({
  def,
  entry,
  submitLabel,
  cancelTo,
  onSaved,
}: SimpleEntryFormProps) {
  const form = useForm<SimpleFormValues>({
    initialValues: toSimpleFormValues(def, entry),
    // Правила своих полей раздела — только в форме этого раздела.
    validate: { ...simpleFormValidate, ...def.extras.validate },
  });
  const [draft, setDraft] = useImageDraft(entry?.image ?? null);
  // Запись на сервере. При создании она появляется после первого «Сохранить»: если
  // картинка тогда не загрузилась, повторное сохранение правит уже созданную запись.
  const [saved, setSaved] = useState(entry);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Вопрос перед сохранением (публикация со скрытыми эффектами, скрытие эффекта) — до
  // ответа запрос не уходит.
  const [confirmation, setConfirmation] = useState<SaveConfirmation | null>(
    null,
  );

  const save = (values: SimpleFormValues, flags: SaveFlags) => {
    setError(null);
    setSubmitting(true);
    // Флаги ответа на вопрос — только в этом запросе, в записи не хранятся.
    const input = { ...toSimpleInput(def, values), ...flags };
    const savedId = saved?.id;
    saveWithImage(
      () => (savedId ? def.api.update(savedId, input) : def.api.create(input)),
      def.api,
      draft,
      saved?.image ?? null,
    )
      .then(async ({ entry: result, imageError }) => {
        // Своё сохранение раздела — и после неудачной картинки: запись уже есть.
        const extraError =
          (await def.extras.afterSave?.(result, values)) ?? null;
        const problem = imageError
          ? `${def.texts.imageNotSaved}: ${imageError}`
          : extraError;
        if (!problem) {
          onSaved(result);
          return;
        }
        setSaved(result);
        setError(
          `${problem}. Нажмите «${submitLabel}», чтобы попробовать ещё раз.`,
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to save catalog entry', err);
        setError(errorMessage(err, def.texts.saveFailed));
      })
      .finally(() => setSubmitting(false));
  };

  const handleSubmit = form.onSubmit((values) => {
    const question = def.extras.saveConfirmation?.(values, saved) ?? null;
    if (question) setConfirmation(question);
    else save(values, {});
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, sm: 'content' }}>
            {def.extras.picture ? (
              def.extras.picture.values(form.values)
            ) : (
              <ImageField
                entryId={saved?.id ?? null}
                entryName={form.values.name}
                imagePath={def.api.imagePath}
                draft={draft}
                onChange={setDraft}
              />
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 'auto' }}>
            <Stack>
              <TextInput
                label="Название"
                required
                placeholder={def.texts.namePlaceholder}
                {...form.getInputProps('name')}
              />
              {/* Категория — только у способностей (docs/plan/done/abilities.md). */}
              {def.categories && (
                <Select
                  label="Категория"
                  description={
                    def.categories.length === 1
                      ? 'Другие категории появятся позже'
                      : def.categoryHints?.[form.getValues().category]
                  }
                  data={def.categories.map((value) => ({
                    value,
                    label: def.kinds.labels[value],
                  }))}
                  allowDeselect={false}
                  maw={320}
                  {...form.getInputProps('category')}
                />
              )}
              <def.extras.Field form={form} />
              <Textarea
                label="Описание"
                placeholder={def.texts.descriptionPlaceholder}
                autosize
                minRows={6}
                maxRows={18}
                {...form.getInputProps('description')}
              />
              <SourcesField
                value={form.values.sources}
                onChange={(sources) => form.setFieldValue('sources', sources)}
              />
              <Switch
                label="Показывать в каталоге"
                description={def.texts.publicHint}
                {...form.getInputProps('isPublic', { type: 'checkbox' })}
              />
            </Stack>
          </Grid.Col>
        </Grid>
        {confirmation && (
          <SaveConfirm
            confirmation={confirmation}
            onConfirm={(flags) => {
              setConfirmation(null);
              save(form.getValues(), flags);
            }}
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

export default SimpleEntryForm;
