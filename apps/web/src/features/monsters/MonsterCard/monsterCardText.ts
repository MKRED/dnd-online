import {
  CONDITION_LABELS,
  DAMAGE_TYPE_LABELS,
  formatSense,
  formatXp,
  type MonsterHitPoints,
  type MonsterStatBlock,
} from 'shared';
import { ABILITY_LABELS, SKILL_LABELS, formatModifier } from '../../characters';

// Тексты карточки монстра. Числа — как ввёл мастер: приложение их не пересчитывает
// (docs/plan/monsters-npcs.md, «Монстр в каталоге»).

// «+5», «−1»: минус типографский, как в книге.
export const formatSigned = (n: number) => formatModifier(n).replace('-', '−');

// «+7 (17)»: модификатор и значение инициативы, как в книге 2024.
export const formatInitiative = (modifier: number) =>
  `${formatSigned(modifier)} (${10 + modifier})`;

// «20к10 + 40», «1к4 − 1», «2к8».
export function formatHitDice({ dice }: MonsterHitPoints): string {
  const base = `${dice.count}к${dice.die}`;
  if (dice.bonus === 0) return base;
  return `${base} ${dice.bonus > 0 ? '+' : '−'} ${Math.abs(dice.bonus)}`;
}

// «ПО 10 · Опыт 5 900 (7 200 в логове) · БМ +4» собирает шапка; здесь — опыт в логове.
export const formatLairXp = (lairXp: number | null) =>
  lairXp === null ? '' : ` (${formatXp(lairXp)} в логове)`;

// «История +12, Восприятие +10» — под характеристиками, как в книге.
export const formatSkills = (block: MonsterStatBlock) =>
  block.skills
    .map(({ skill, bonus }) => `${SKILL_LABELS[skill]} ${formatSigned(bonus)}`)
    .join(', ');

// «3 за раунд, 4 в логове» — запас легендарных действий; пусто, если их нет.
export const formatLegendaryCount = (block: MonsterStatBlock) =>
  block.legendaryActions === null
    ? ''
    : `${block.legendaryActions} за раунд` +
      (block.legendaryActionsLair === null
        ? ''
        : `, ${block.legendaryActionsLair} в логове`);

// «Интеллект, СЛ 16, атака +8»; пусто, если поля колдовства не заданы.
export function formatSpellcasting({ spellcasting }: MonsterStatBlock) {
  const { ability, saveDc, attackBonus } = spellcasting;
  return [
    ability && ABILITY_LABELS[ability],
    saveDc !== null && `СЛ ${saveDc}`,
    attackBonus !== null && `атака ${formatSigned(attackBonus)}`,
  ]
    .filter(Boolean)
    .join(', ');
}

// Что уже стоит в заголовках «Умений» и «Заклинаний» — там и показываем, а не дважды.
export interface ShownWithAbilities {
  legendary: boolean;
  spellcasting: boolean;
}

// Строки «Защита, чувства, языки» в порядке книги; пустые не показываются. Запас
// легендарных действий и колдовство — здесь, только пока на карточке нет их групп.
export function monsterTraitRows(
  block: MonsterStatBlock,
  shown: ShownWithAbilities = { legendary: false, spellcasting: false },
) {
  const damage = (list: MonsterStatBlock['immunities']) =>
    list.map((type) => DAMAGE_TYPE_LABELS[type].toLowerCase()).join(', ');
  const senses = [
    ...block.senses.map(formatSense),
    `пассивное Восприятие ${block.passivePerception}`,
  ].join('; ');

  return [
    ['Уязвимости', damage(block.vulnerabilities)],
    ['Сопротивления', damage(block.resistances)],
    ['Иммунитеты', damage(block.immunities)],
    [
      'Иммунитеты к состояниям',
      block.conditionImmunities
        .map((kind) => CONDITION_LABELS[kind].toLowerCase())
        .join(', '),
    ],
    ['Чувства', senses],
    ['Языки', block.languages || '—'],
    [
      'Легендарные действия',
      shown.legendary ? '' : formatLegendaryCount(block),
    ],
    ['Колдовство', shown.spellcasting ? '' : formatSpellcasting(block)],
  ].filter(([, value]) => value) as [string, string][];
}
