import { Stack } from '@mantine/core';
import { useMemo } from 'react';
import { sheetTotals, type Character } from 'shared';
import CharacterAbilities from '../Abilities';
import InventorySection from '../Inventory';
import { AppliedEffectList, effectRows, traitRows } from '../AppliedEffects';
import AbilitiesView from './AbilitiesView';
import CombatView from './CombatView';
import ProficienciesView from './ProficienciesView';

// Разделы листа для вкладок окна карточки на сцене игры (docs/plan/done/scene-page.md, этап 4).
export type SheetSection = 'stats' | 'abilities' | 'effects' | 'gear';

interface CharacterSheetSectionProps {
  character: Character;
  section: SheetSection;
}

// Часть листа персонажа или НПС, только для чтения: правки идут через состояние в
// шапке окна. Числа — итог с чертами и эффектами, как лист открывается в игре.
function CharacterSheetSection({
  character,
  section,
}: CharacterSheetSectionProps) {
  const totals = useMemo(() => sheetTotals(character), [character]);
  switch (section) {
    case 'stats':
      return (
        <Stack gap="md">
          <CombatView character={character} totals={totals} />
          <AbilitiesView character={character} />
          <ProficienciesView character={character} />
        </Stack>
      );
    case 'abilities':
      return <CharacterAbilities character={character} />;
    case 'effects':
      // Каждый эффект строкой с тем, что он даёт (вариант А, замечания после первой партии,
      // 2026-10-26): итог по темам не показывал Скорость и КД, и эффект «Захват» выглядел
      // как «Эффектов нет».
      return (
        <AppliedEffectList
          rows={[
            ...effectRows(character.effects, 'наложен'),
            ...traitRows(character.abilities),
          ]}
        />
      );
    case 'gear':
      return <InventorySection character={character} />;
  }
}

export default CharacterSheetSection;
