import {
  Grid,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import {
  MONSTER_ALIGNMENT_MAX_LENGTH,
  MONSTER_CHALLENGES,
  MONSTER_ROLE_LABELS,
  MONSTER_ROLES,
  MONSTER_SIZE_LABELS,
  MONSTER_SIZES,
  MONSTER_TAGS_MAX_LENGTH,
  MONSTER_TYPE_LABELS,
  MONSTER_TYPES,
  challengeProficiencyBonus,
  formatChallengeXp,
  type MonsterChallenge,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import type { MonsterFormValues } from './monsterFormValues';
import { useWatched } from './useWatched';

const TYPE_OPTIONS = MONSTER_TYPES.map((value) => ({
  value,
  label: MONSTER_TYPE_LABELS[value],
}));
const SIZE_OPTIONS = MONSTER_SIZES.map((value) => ({
  value,
  label: MONSTER_SIZE_LABELS[value],
}));
const ROLE_OPTIONS = MONSTER_ROLES.map((value) => ({
  value,
  label: MONSTER_ROLE_LABELS[value],
}));
const CHALLENGE_OPTIONS = MONSTER_CHALLENGES.map((value) => ({
  value,
  label: value,
}));

interface IdentitySectionProps {
  form: UseFormReturnType<MonsterFormValues>;
}

// Кто это: название, тип, размер, теги, мировоззрение, роль и ПО. Стоит рядом с картинкой.
function IdentitySection({ form }: IdentitySectionProps) {
  const challenge = useWatched<MonsterChallenge>(
    form,
    'challenge',
    (values) => values.challenge,
  );
  return (
    <Stack>
      <TextInput
        label="Название"
        required
        placeholder="Например, Аболет"
        {...form.getInputProps('name')}
      />
      <Grid>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <Select
            label="Тип"
            data={TYPE_OPTIONS}
            searchable
            allowDeselect={false}
            nothingFoundMessage="Такого типа нет"
            {...form.getInputProps('category')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <Select
            label="Размер"
            data={SIZE_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('size')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <TextInput
            label="Теги"
            description="В скобках после типа, как в книге"
            placeholder="Например, маг"
            maxLength={MONSTER_TAGS_MAX_LENGTH}
            {...form.getInputProps('tags')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <TextInput
            label="Мировоззрение"
            description="Как в книге, со строчной буквы"
            placeholder="Например, законно-злой"
            maxLength={MONSTER_ALIGNMENT_MAX_LENGTH}
            {...form.getInputProps('alignment')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <Select
            label="Показатель опасности (ПО)"
            description={`Опыт ${formatChallengeXp(challenge)}, бонус мастерства +${challengeProficiencyBonus(challenge)}`}
            data={CHALLENGE_OPTIONS}
            searchable
            allowDeselect={false}
            nothingFoundMessage="ПО — от 0 до 30"
            {...form.getInputProps('challenge')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <NumberInput
            label="Опыт в логове"
            description="Только у монстра с логовом"
            placeholder="Нет"
            min={0}
            allowDecimal={false}
            allowNegative={false}
            thousandSeparator=" "
            {...form.getInputProps('lairXp')}
          />
        </Grid.Col>
      </Grid>
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Роль
        </Text>
        <SegmentedControl
          aria-label="Роль"
          data={ROLE_OPTIONS}
          style={{ alignSelf: 'flex-start' }}
          {...form.getInputProps('role')}
        />
        <Text size="xs" c="dimmed">
          Уникальный монстр (босс) бывает на сцене только один.
        </Text>
      </Stack>
    </Stack>
  );
}

export default memo(IdentitySection, formErrorsEqual);
