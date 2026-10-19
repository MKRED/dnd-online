import type { CharacterAbilityEntry } from 'shared';
import { SkillsBlock } from '../../abilityLinks';
import { skillGroups } from './abilitiesView';
import { useAbilitiesEditor } from './useAbilitiesEditor';

interface SkillsSectionProps {
  characterId: string;
  abilities: CharacterAbilityEntry[];
  // Есть — автор добавляет, отмечает и убирает способности; нет — только чтение.
  onChange?: (abilities: CharacterAbilityEntry[]) => void;
}

// Блок «Умения» (docs/plan/done/character-abilities.md): способности категории «Базовая» по
// активации. Список и окно — общие с монстром (features/abilityLinks).
function SkillsSection({
  characterId,
  abilities,
  onChange,
}: SkillsSectionProps) {
  const { editor, api, renderRow } = useAbilitiesEditor(characterId, onChange);
  return (
    <SkillsBlock
      entries={abilities}
      groups={skillGroups(abilities)}
      owner="character"
      editor={editor}
      onAdd={onChange && ((abilityId) => api.add({ abilityId }))}
      renderRow={renderRow}
    />
  );
}

export default SkillsSection;
