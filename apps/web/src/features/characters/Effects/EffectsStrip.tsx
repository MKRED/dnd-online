import type { Character, CharacterEffectEntry } from 'shared';
import EffectLinksStrip from './EffectLinksStrip';

interface EffectsStripProps {
  character: Character;
  // Есть — автор накладывает и снимает эффекты; нет — лист только для чтения.
  onChange?: (effects: CharacterEffectEntry[]) => void;
}

// Плашки эффектов на листе персонажа; полоса — общая с монстром.
function EffectsStrip({ character, onChange }: EffectsStripProps) {
  return (
    <EffectLinksStrip
      effects={character.effects}
      apiBase={`/characters/${character.id}/effects`}
      owner="character"
      onChange={onChange}
    />
  );
}

export default EffectsStrip;
