import {
  formatPerDay,
  type AbilityActivationKind,
  type MonsterAbilityEntry,
  type MonsterStatBlock,
} from 'shared';
import { hasCard, type AbilityGroup, type CardEntry } from '../../abilityLinks';
import { formatLegendaryCount } from '../MonsterCard/monsterCardText';

type SpellEntry = CardEntry<MonsterAbilityEntry>;

// Группы «Умений» монстра — как разделы стат-блока в книге (docs/dnd/monsters.md). Своих
// разделов у «Без действия», «Вместо атаки» и долгого применения в книге нет: первое
// стоит среди черт, остальные — среди действий. Условие и время видны в строке.
const MONSTER_SKILL_GROUPS = [
  { key: 'trait', title: 'Черты', kinds: ['trait', 'free'] },
  { key: 'action', title: 'Действия', kinds: ['action', 'attack', 'time'] },
  { key: 'bonus_action', title: 'Бонусные действия', kinds: ['bonus_action'] },
  { key: 'reaction', title: 'Реакции', kinds: ['reaction'] },
  { key: 'legendary', title: 'Легендарные действия', kinds: ['legendary'] },
] as const satisfies readonly {
  key: string;
  title: string;
  kinds: readonly AbilityActivationKind[];
}[];

export const monsterGroupKinds = (): AbilityActivationKind[] =>
  MONSTER_SKILL_GROUPS.flatMap((group) => group.kinds);

// «Легендарные действия (3 за раунд, 4 в логове)» — запас из стат-блока.
const legendaryTitle = (block: MonsterStatBlock) => {
  const count = formatLegendaryCount(block);
  return count ? `Легендарные действия (${count})` : 'Легендарные действия';
};

// «Умения» монстра: всё, кроме заклинаний, пустые группы не показываются. Скрытые и
// удалённые — отдельной группой в конце: их категория не видна.
export function monsterSkillGroups(
  entries: readonly MonsterAbilityEntry[],
  block: MonsterStatBlock,
): AbilityGroup<MonsterAbilityEntry>[] {
  const skills = entries
    .filter(hasCard)
    .filter((e) => e.ability.category !== 'spell');
  const groups: AbilityGroup<MonsterAbilityEntry>[] = MONSTER_SKILL_GROUPS.map(
    ({ key, title, kinds }) => ({
      key,
      title: key === 'legendary' ? legendaryTitle(block) : title,
      entries: skills.filter((e) =>
        (kinds as readonly string[]).includes(e.ability.activation.kind),
      ),
    }),
  );
  groups.push({
    key: 'missing',
    title: 'Недоступны',
    entries: entries.filter((e) => !hasCard(e)),
  });
  return groups.filter((group) => group.entries.length > 0);
}

// «Заклинания» монстра по частоте, как в книге: «Неограниченно», затем «N/день» по
// убыванию. Ячеек у монстра нет.
export function monsterSpellGroups(
  entries: readonly MonsterAbilityEntry[],
): AbilityGroup<SpellEntry>[] {
  const spells = entries
    .filter(hasCard)
    .filter((e) => e.ability.category === 'spell');
  const frequencies = [...new Set(spells.map((e) => e.perDay))].sort(
    (a, b) => (b ?? Infinity) - (a ?? Infinity),
  );
  return frequencies.map((perDay) => ({
    key: String(perDay),
    title: formatPerDay(perDay),
    entries: spells.filter((e) => e.perDay === perDay),
  }));
}
