import { Alert, Button, Fieldset, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import type { CharacterAbilityEntry } from 'shared';
import classes from './Abilities.module.css';
import { addAbility } from './abilitiesApi';
import { skillGroups } from './abilitiesView';
import AbilityRow from './AbilityRow';
import AddAbilityDialog from './AddAbilityDialog';
import { useAbilitiesEditor } from './useAbilitiesEditor';

interface SkillsSectionProps {
  characterId: string;
  abilities: CharacterAbilityEntry[];
  // Есть — автор добавляет, отмечает и убирает способности; нет — только чтение.
  onChange?: (abilities: CharacterAbilityEntry[]) => void;
}

// Блок «Умения» (docs/plan/done/character-abilities.md): способности категории «Базовая» по
// активации. «+ Способность» здесь добавляет и заклинания — они встают в «Заклинания».
// Список и окно берут строки и обработчики, а не персонажа: их возьмёт и монстр.
function SkillsSection({
  characterId,
  abilities,
  onChange,
}: SkillsSectionProps) {
  const [adding, setAdding] = useState(false);
  const { busyId, error, setError, run, handlers } = useAbilitiesEditor(
    characterId,
    onChange,
  );
  const groups = skillGroups(abilities);
  if (!onChange && groups.length === 0) return null;

  const empty =
    abilities.length === 0
      ? 'Способностей пока нет — добавьте умения и заклинания из каталога.'
      : 'Умений нет — только заклинания.';

  return (
    <Fieldset legend="Умения">
      <Stack gap="sm">
        {onChange && (
          <Group justify="space-between" gap="sm">
            {groups.length === 0 ? (
              <Text size="sm" c="dimmed">
                {empty}
              </Text>
            ) : (
              <span />
            )}
            <Button size="xs" onClick={() => setAdding(true)}>
              + Способность
            </Button>
          </Group>
        )}
        {groups.map((group) => (
          <div key={group.key}>
            <Text size="sm" fw={600}>
              {group.title}
            </Text>
            <Stack gap={2} className={classes.groupEntries}>
              {group.entries.map((entry) => (
                <AbilityRow key={entry.id} entry={entry} {...handlers} />
              ))}
            </Stack>
          </div>
        ))}
        {/* Ошибку добавления показывает само окно; ошибка правки — под строками,
            чтобы не сдвигать их. */}
        {error && !adding && (
          <Alert
            color="red"
            variant="light"
            p="xs"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
      </Stack>
      {adding && (
        <AddAbilityDialog
          added={abilities}
          busy={busyId === 'add'}
          error={error}
          onAdd={(abilityId) =>
            run(
              'add',
              () => addAbility(characterId, { abilityId }),
              'Не удалось добавить способность',
            )
          }
          onClose={() => {
            setAdding(false);
            setError(null);
          }}
        />
      )}
    </Fieldset>
  );
}

export default SkillsSection;
