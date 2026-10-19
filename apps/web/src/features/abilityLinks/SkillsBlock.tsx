import { Alert, Button, Fieldset, Group, Stack, Text } from '@mantine/core';
import { useState, type ReactNode } from 'react';
import type { AbilityGroup, AbilityLinkEntry } from './abilityLinkView';
import AddAbilityDialog from './AddAbilityDialog';
import GroupEntries from './GroupEntries';
import type { AbilityOwnerKind } from './useAbilityCandidates';
import type { AbilityLinksEditor } from './useAbilityLinksEditor';

interface SkillsBlockProps<E extends AbilityLinkEntry> {
  entries: E[];
  // Группы без заклинаний: те стоят в своём блоке.
  groups: AbilityGroup<E>[];
  owner: AbilityOwnerKind;
  editor: AbilityLinksEditor<E>;
  // Есть — владелец добавляет способности; нет — только чтение.
  onAdd?: (abilityId: string, perDay: number | null) => Promise<E[]>;
  renderRow: (entry: E) => ReactNode;
}

const EMPTY: Record<AbilityOwnerKind, string> = {
  character:
    'Способностей пока нет — добавьте умения и заклинания из каталога.',
  monster: 'Способностей пока нет — добавьте их из каталога.',
};

// Блок «Умения» персонажа или монстра: группы строк и «+ Способность». Кнопка добавляет и
// заклинания — они встают в «Заклинания».
function SkillsBlock<E extends AbilityLinkEntry>({
  entries,
  groups,
  owner,
  editor,
  onAdd,
  renderRow,
}: SkillsBlockProps<E>) {
  const [adding, setAdding] = useState(false);
  const { busyId, error, setError, run } = editor;
  if (!onAdd && groups.length === 0) return null;

  const empty =
    entries.length === 0 ? EMPTY[owner] : 'Умений нет — только заклинания.';

  return (
    <Fieldset legend="Умения">
      <Stack gap="sm">
        {onAdd && (
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
            <GroupEntries>{group.entries.map(renderRow)}</GroupEntries>
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
      {adding && onAdd && (
        <AddAbilityDialog
          added={entries}
          owner={owner}
          busy={busyId === 'add'}
          error={error}
          onAdd={(abilityId, perDay) =>
            run(
              'add',
              () => onAdd(abilityId, perDay),
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

export default SkillsBlock;
