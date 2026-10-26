import { Stack } from '@mantine/core';
import { useMemo } from 'react';
import { sheetTotals, type Character } from 'shared';
import CharacterAbilities from '../Abilities';
import type { SheetSpellActions } from '../Abilities/sheetSpellActions';
import EquipmentSection from '../Equipment';
import InventorySection from '../Inventory';
import { AppliedEffectList, effectRows, traitRows } from '../AppliedEffects';
import AbilitiesView from './AbilitiesView';
import CombatView from './CombatView';
import ProficienciesView from './ProficienciesView';
import SheetAttacks from './SheetAttacks';

// Разделы листа для вкладок окна карточки на сцене игры (docs/plan/done/scene-page.md, этап 4).
export type SheetSection = 'stats' | 'abilities' | 'effects' | 'gear';

interface CharacterSheetSectionProps {
  character: Character;
  section: SheetSection;
  // Ячейки и подготовка в игре (вариант А после первой партии): нет — только чтение.
  spellActions?: SheetSpellActions;
}

// Часть листа персонажа или НПС, только для чтения, кроме ячеек и подготовки заклинаний
// (spellActions): остальные правки идут через состояние в шапке окна. Числа — итог с
// чертами и эффектами, как лист открывается в игре.
function CharacterSheetSection({
  character,
  section,
  spellActions,
}: CharacterSheetSectionProps) {
  const totals = useMemo(() => sheetTotals(character), [character]);
  switch (section) {
    case 'stats':
      return (
        <Stack gap="md">
          <CombatView character={character} totals={totals} />
          <SheetAttacks character={character} />
          <AbilitiesView character={character} />
          <ProficienciesView character={character} />
        </Stack>
      );
    case 'abilities':
      return (
        <CharacterAbilities character={character} spellActions={spellActions} />
      );
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
      // Окно карточки узкое и не одно на сцене: кукла без 3D-модели, с силуэтом.
      return (
        <Stack gap="md">
          <EquipmentSection character={character} model={false} />
          <InventorySection character={character} />
        </Stack>
      );
  }
}

export default CharacterSheetSection;
