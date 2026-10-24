import {
  Alert,
  Button,
  Grid,
  Group,
  Stack,
  Switch,
  Textarea,
} from '@mantine/core';
import { useForm, type FormErrors } from '@mantine/form';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Monster } from 'shared';
import { FormErrorSummary, focusField } from '../../../components/form';
import { errorMessage } from '../../../lib/apiRequest';
import {
  ImageField,
  saveWithImage,
  SourcesField,
  useImageDraft,
} from '../../catalog';
import { MonsterModelSection } from '../MonsterModel';
import { monstersApi } from '../monstersApi';
import AbilitiesSection from './AbilitiesSection';
import CombatSection from './CombatSection';
import DefensesSection from './DefensesSection';
import IdentitySection from './IdentitySection';
import LegendarySection from './LegendarySection';
import { monsterErrorFields } from './monsterErrorFields';
import { validateMonsterForm } from './monsterFormValidate';
import {
  toMonsterFormValues,
  toMonsterInput,
  type MonsterFormValues,
} from './monsterFormValues';
import SensesSection from './SensesSection';
import SkillsSection from './SkillsSection';
import { useWatched } from './useWatched';

interface MonsterFormProps {
  // null — создание нового монстра.
  monster: Monster | null;
  submitLabel: string;
  cancelTo: string;
  onSaved: (monster: Monster) => void;
}

// Форма монстра: стат-блок по группам, как форма персонажа, и картинка с источниками,
// как у записей справочника. Поля и картинка сохраняются одной кнопкой.
function MonsterForm({
  monster,
  submitLabel,
  cancelTo,
  onSaved,
}: MonsterFormProps) {
  const form = useForm<MonsterFormValues>({
    // Полей много — в controlled-режиме каждая буква перерисовывала бы всю форму
    // (так было у персонажа, см. CharacterForm).
    mode: 'uncontrolled',
    initialValues: toMonsterFormValues(monster),
    validate: validateMonsterForm,
  });
  const name = useWatched(form, 'name', (values) => values.name);
  const [sources, setSources] = useState(monster?.sources ?? []);
  const [draft, setDraft] = useImageDraft(monster?.image ?? null);
  // Монстр на сервере. При создании он появляется после первого «Сохранить»: если
  // картинка тогда не загрузилась, повторное сохранение правит уже созданного.
  const [saved, setSaved] = useState(monster);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const invalid = monsterErrorFields(form.errors);

  const save = (values: MonsterFormValues) => {
    setError(null);
    setSubmitting(true);
    const input = toMonsterInput(values, sources);
    const savedId = saved?.id;
    saveWithImage(
      () =>
        savedId
          ? monstersApi.update(savedId, input)
          : monstersApi.create(input),
      monstersApi,
      draft,
      saved?.image ?? null,
    )
      .then(({ entry, imageError }) => {
        if (!imageError) {
          onSaved(entry);
          return;
        }
        setSaved(entry);
        setError(
          `Монстр сохранён, а картинка — нет: ${imageError}. Нажмите «${submitLabel}», чтобы попробовать ещё раз.`,
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to save monster', err);
        setError(errorMessage(err, 'Не удалось сохранить монстра'));
      })
      .finally(() => setSubmitting(false));
  };

  // Кнопка внизу длинной формы, а ошибка может быть в самом начале: ведём к первой.
  const handleInvalid = (
    errors: FormErrors,
    _values: MonsterFormValues,
    event?: FormEvent<HTMLFormElement>,
  ) => {
    const [first] = monsterErrorFields(errors);
    if (first && event) focusField(event.currentTarget, first.path);
  };

  return (
    // noValidate: обязательные поля проверяет форма, а не браузер (как у персонажа).
    <form noValidate onSubmit={form.onSubmit(save, handleInvalid)}>
      <Stack>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, sm: 'content' }}>
            <ImageField
              entryId={saved?.id ?? null}
              entryName={name}
              imagePath={monstersApi.imagePath}
              draft={draft}
              onChange={setDraft}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 'auto' }}>
            <IdentitySection form={form} />
          </Grid.Col>
        </Grid>
        <CombatSection form={form} />
        <AbilitiesSection form={form} />
        <SkillsSection form={form} />
        <DefensesSection form={form} />
        <SensesSection form={form} />
        <LegendarySection form={form} />
        <MonsterModelSection form={form} />
        <Textarea
          label="Описание"
          description="Черты, действия и заклинания монстра появятся на карточке позже; пока их можно описать здесь, как и логово"
          autosize
          minRows={6}
          maxRows={18}
          {...form.getInputProps('description')}
        />
        <SourcesField value={sources} onChange={setSources} />
        <Switch
          label="Показывать в каталоге"
          description="Скрытого монстра видите только вы. Опубликованного видят все, но менять его можете только вы."
          {...form.getInputProps('isPublic', { type: 'checkbox' })}
        />
        {invalid.length > 0 && (
          <FormErrorSummary
            title="Монстр не сохранён — исправьте поля"
            fields={invalid}
            onPick={(path, from) => focusField(from, path)}
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

export default MonsterForm;
