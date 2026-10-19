import type { Character, CharacterAbilityEntry, SpellSlots } from 'shared';
import SkillsSection from './SkillsSection';
import SpellsSection from './SpellsSection';

interface CharacterAbilitiesProps {
  character: Character;
  // Есть — автор меняет способности и тратит ячейки на листе; нет — только чтение.
  onAbilitiesChange?: (abilities: CharacterAbilityEntry[]) => void;
  onSpellSlotsChange?: (spellSlots: SpellSlots) => void;
}

// «Умения» и «Заклинания» на листе персонажа (docs/plan/character-abilities.md).
function CharacterAbilities({
  character,
  onAbilitiesChange,
  onSpellSlotsChange,
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
      />
    </>
  );
}

export default CharacterAbilities;
