import { Grid, SegmentedControl, Stack } from '@mantine/core';
import { useMemo, useState, type ReactNode } from 'react';
import {
  sheetTotals,
  type Character,
  type CharacterAbilityEntry,
  type CharacterEffectEntry,
  type InventoryEntry,
  type SpellSlots,
} from 'shared';
import AbilitiesView from './AbilitiesView';
import CombatView from './CombatView';
import EffectSummary from './EffectSummary';
import EffectsStrip from '../Effects';
import CharacterAbilities from '../Abilities';
import EquipmentSection, { anythingWorn } from '../Equipment';
import InventorySection from '../Inventory';
import PersonalityView from './PersonalityView';
import ProficienciesView from './ProficienciesView';
import SheetHeader from './SheetHeader';
import SheetImages from './SheetImages';

interface CharacterSheetProps {
  character: Character;
  aside: ReactNode;
  // Есть — автор меняет инвентарь прямо на листе; нет — лист только для чтения.
  onInventoryChange?: (inventory: InventoryEntry[]) => void;
  // Есть — автор накладывает и снимает эффекты на листе.
  onEffectsChange?: (effects: CharacterEffectEntry[]) => void;
  // Есть — автор тратит и возвращает ячейки заклинаний на листе.
  onSpellSlotsChange?: (spellSlots: SpellSlots) => void;
  // Есть — автор добавляет, отмечает и убирает способности на листе.
  onAbilitiesChange?: (abilities: CharacterAbilityEntry[]) => void;
  // false — без галереи: лист из игры (её картинки видит только владелец).
  images?: boolean;
}

// Лист персонажа — так его видят и автор, и зритель по ссылке. Менять на листе можно
// только инвентарь с куклой, наложенные эффекты, способности и потраченные ячейки (у автора);
// остальное — формой.
// Разделы идут в порядке формы, пустые не показываются.
function CharacterSheet({
  character,
  aside,
  onInventoryChange,
  onEffectsChange,
  onSpellSlotsChange,
  onAbilitiesChange,
  images = true,
}: CharacterSheetProps) {
  // Вид листа: итог с эффектами или без них. Не запоминается — лист всегда открывается
  // итогом, в игре нужен он (решено с пользователем 2026-10-17). Черты считаются в обоих
  // видах: они часть персонажа (docs/plan/done/traits.md).
  const [withEffects, setWithEffects] = useState(true);
  const hasEffects = character.effects.length > 0;
  const totals = useMemo(() => sheetTotals(character), [character]);
  const base = useMemo(() => sheetTotals(character, []), [character]);
  const shown = hasEffects && !withEffects ? base : totals;
  // Кукла видна автору всегда, зрителю — когда на персонаже что-то надето. Тогда 3D-модель
  // стоит в её центре, а не под портретом.
  const dollShown =
    Boolean(onInventoryChange) || anythingWorn(character.inventory);

  return (
    <Stack gap="lg">
      <Grid gap="xl">
        {images && (
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <SheetImages
              characterId={character.id}
              characterName={character.name}
              model={!dollShown}
            />
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 12, sm: images ? 8 : 12 }}>
          <Stack gap="md">
            <SheetHeader character={character} aside={aside} />
            <EffectsStrip character={character} onChange={onEffectsChange} />
            {hasEffects && (
              <SegmentedControl
                aria-label="Вид листа"
                size="xs"
                value={withEffects ? 'with' : 'base'}
                onChange={(value) => setWithEffects(value === 'with')}
                data={[
                  { value: 'with', label: 'С эффектами' },
                  { value: 'base', label: 'Без эффектов' },
                ]}
              />
            )}
            <CombatView character={character} totals={shown} />
            <EffectSummary totals={shown} />
          </Stack>
        </Grid.Col>
      </Grid>
      <AbilitiesView character={character} />
      <CharacterAbilities
        character={character}
        onAbilitiesChange={onAbilitiesChange}
        onSpellSlotsChange={onSpellSlotsChange}
      />
      <ProficienciesView character={character} />
      <EquipmentSection character={character} onChange={onInventoryChange} />
      <InventorySection character={character} onChange={onInventoryChange} />
      <PersonalityView character={character} />
    </Stack>
  );
}

export default CharacterSheet;
