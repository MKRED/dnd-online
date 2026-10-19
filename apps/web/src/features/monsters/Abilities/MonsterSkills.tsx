import type { MonsterAbilityEntry, MonsterStatBlock } from 'shared';
import { SkillsBlock } from '../../abilityLinks';
import { monsterSkillGroups } from './monsterAbilitiesView';
import { useMonsterAbilitiesEditor } from './useMonsterAbilitiesEditor';

interface MonsterSkillsProps {
  monsterId: string;
  abilities: MonsterAbilityEntry[];
  block: MonsterStatBlock;
  // Есть — автор добавляет и убирает способности; нет — только чтение.
  onChange?: (abilities: MonsterAbilityEntry[]) => void;
}

// Блок «Умения» монстра: черты, действия, реакции и легендарные действия по разделам
// стат-блока. Список и окно — общие с персонажем (features/abilityLinks).
function MonsterSkills({
  monsterId,
  abilities,
  block,
  onChange,
}: MonsterSkillsProps) {
  const { editor, api, renderRow } = useMonsterAbilitiesEditor(
    monsterId,
    onChange,
  );
  return (
    <SkillsBlock
      entries={abilities}
      groups={monsterSkillGroups(abilities, block)}
      owner="monster"
      editor={editor}
      onAdd={
        onChange && ((abilityId, perDay) => api.add({ abilityId, perDay }))
      }
      renderRow={renderRow}
    />
  );
}

export default MonsterSkills;
