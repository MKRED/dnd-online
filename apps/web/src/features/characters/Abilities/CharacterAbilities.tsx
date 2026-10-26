import type { Character, CharacterAbilityEntry, SpellSlots } from 'shared';
import type { SheetSpellActions } from './sheetSpellActions';
import SkillsSection from './SkillsSection';
import SpellsSection from './SpellsSection';

interface CharacterAbilitiesProps {
  character: Character;
  // Есть — автор меняет способности и тратит ячейки на листе; нет — только чтение.
  onAbilitiesChange?: (abilities: CharacterAbilityEntry[]) => void;
  onSpellSlotsChange?: (spellSlots: SpellSlots) => void;
  // Ячейки и подготовка через игру — окно карточки на сцене.
  spellActions?: SheetSpellActions;
}

// «Умения» и «Заклинания» на листе персонажа (docs/plan/done/character-abilities.md).
function CharacterAbilities({
  character,
  onAbilitiesChange,
  onSpellSlotsChange,
  spellActions,
}: CharacterAbilitiesProps) {
  const { id, abilities, spellSlots } = character;
  return (
    <>
      <SkillsSection
        characterId={id}
        abilities={abilities}
        onChange={onAbilitiesChange}
      />
      <SpellsSection
        characterId={id}
        abilities={abilities}
        spellSlots={spellSlots}
        onSlotsChange={onSpellSlotsChange}
        onAbilitiesChange={onAbilitiesChange}
        actions={spellActions}
      />
    </>
  );
}

export default CharacterAbilities;
