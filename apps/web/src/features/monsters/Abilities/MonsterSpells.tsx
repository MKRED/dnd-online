import { Alert, Fieldset, Stack, Text } from '@mantine/core';
import type { MonsterAbilityEntry, MonsterStatBlock } from 'shared';
import { GroupEntries } from '../../abilityLinks';
import { formatSpellcasting } from '../MonsterCard/monsterCardText';
import { monsterSpellGroups } from './monsterAbilitiesView';
import { useMonsterAbilitiesEditor } from './useMonsterAbilitiesEditor';

interface MonsterSpellsProps {
  monsterId: string;
  abilities: MonsterAbilityEntry[];
  block: MonsterStatBlock;
  // Есть — автор меняет частоту и убирает заклинания; нет — только чтение.
  onChange?: (abilities: MonsterAbilityEntry[]) => void;
}

// Блок «Заклинания» монстра: «Колдовство» из стат-блока сверху, строки по частоте.
// Добавляют заклинания кнопкой «+ Способность» в «Умениях».
function MonsterSpells({
  monsterId,
  abilities,
  block,
  onChange,
}: MonsterSpellsProps) {
  const rows = useMonsterAbilitiesEditor(monsterId, onChange);
  const groups = monsterSpellGroups(abilities);
  if (groups.length === 0) return null;
  const spellcasting = formatSpellcasting(block);
  const { error, setError } = rows.editor;

  return (
    <Fieldset legend="Заклинания">
      <Stack gap="xs">
        {spellcasting && (
          <Text size="sm">
            <Text span size="sm" fw={600}>
              Колдовство:
            </Text>{' '}
            {spellcasting}
          </Text>
        )}
        {groups.map((group) => (
          <div key={group.key}>
            <Text size="sm" fw={600}>
              {group.title}
            </Text>
            <GroupEntries>{group.entries.map(rows.renderRow)}</GroupEntries>
          </div>
        ))}
        {/* Ошибка — под строками, чтобы не сдвигать их. */}
        {error && (
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
    </Fieldset>
  );
}

export default MonsterSpells;
