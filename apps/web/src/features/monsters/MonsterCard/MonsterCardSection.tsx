import { Fieldset, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import type { CharacterEffectEntry, Monster } from 'shared';
import { EffectSummary, SheetField } from '../../characters';
import type { SheetSection } from '../../characters';
import {
  MonsterSkills,
  MonsterSpells,
  monsterSkillGroups,
  monsterSpellGroups,
} from '../Abilities';
import { MonsterGear } from '../Gear';
import MonsterAbilityScores from './MonsterAbilityScores';
import MonsterStats from './MonsterStats';
import { monsterTraitRows } from './monsterCardText';
import { monsterTotals } from './monsterTotals';

interface MonsterCardSectionProps {
  monster: Monster;
  // Эффекты, наложенные на этот экземпляр в игре, — к постоянным эффектам вида.
  extraEffects: readonly CharacterEffectEntry[];
  section: SheetSection;
}

// Часть карточки монстра для вкладок окна на сцене игры (docs/plan/done/scene-page.md, этап 4),
// только для чтения: хиты и эффекты правятся в шапке окна.
function MonsterCardSection({
  monster,
  extraEffects,
  section,
}: MonsterCardSectionProps) {
  const { statBlock } = monster;
  const abilities = monster.abilities ?? [];
  const effects = useMemo(
    () => [...(monster.effects ?? []), ...extraEffects],
    [monster.effects, extraEffects],
  );
  const totals = useMemo(
    () => (effects.length > 0 ? monsterTotals(statBlock, effects) : null),
    [statBlock, effects],
  );
  switch (section) {
    case 'stats': {
      const shown = {
        legendary: monsterSkillGroups(abilities, statBlock).some(
          (group) => group.key === 'legendary',
        ),
        spellcasting: monsterSpellGroups(abilities).length > 0,
      };
      return (
        <Stack gap="md">
          <MonsterStats block={statBlock} totals={totals} />
          <MonsterAbilityScores block={statBlock} />
          <Fieldset legend="Защита, чувства, языки">
            <Stack gap={6}>
              {monsterTraitRows(statBlock, shown).map(([label, value]) => (
                <SheetField key={label} label={label}>
                  {value}
                </SheetField>
              ))}
            </Stack>
          </Fieldset>
        </Stack>
      );
    }
    case 'abilities':
      return (
        <Stack gap="md">
          <MonsterSkills
            monsterId={monster.id}
            abilities={abilities}
            block={statBlock}
          />
          <MonsterSpells
            monsterId={monster.id}
            abilities={abilities}
            block={statBlock}
          />
        </Stack>
      );
    case 'effects':
      return totals ? (
        <EffectSummary totals={totals} />
      ) : (
        <Text size="sm" c="dimmed">
          Эффектов нет.
        </Text>
      );
    case 'gear':
      return <MonsterGear monsterId={monster.id} items={monster.items ?? []} />;
  }
}

export default MonsterCardSection;
