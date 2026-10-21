import type { GameEventPayloads, SpellSlots } from 'shared';

type CharacterChanged = GameEventPayloads['character.changed'];
type CreatureChanged = GameEventPayloads['creature.changed'];

// Строка журнала о правке персонажа в игре (этап 8): что просили и что стало.
export function characterChangedText({ intent, result }: CharacterChanged) {
  const { change } = intent;
  const { character, before, after } = result;
  const hp = `хиты ${before.hitPointsCurrent} → ${after.hitPointsCurrent}`;
  switch (change.kind) {
    case 'damage':
      return result.instantDeath
        ? `Урон: ${character.name} — ${change.amount}, ${hp}, мгновенная смерть`
        : `Урон: ${character.name} — ${change.amount}, ${hp}`;
    case 'heal':
      return `Лечение: ${character.name} — ${change.amount}, ${hp}`;
    case 'temp':
      return `Временные хиты: ${character.name} — ${change.amount}`;
    case 'death_saves':
      return `Спасброски от смерти: ${character.name} — успехов ${change.successes}, провалов ${change.failures}`;
    case 'spell_slots':
      return `Ячейки заклинаний: ${character.name} — ${slotsText(after.spellSlots)}`;
  }
}

// Строка журнала о правке хитов монстра или НПС мастером.
export function creatureChangedText({ intent, result }: CreatureChanged) {
  const { change } = intent;
  const { creature, before, after } = result;
  const hp = `хиты ${before.current} → ${after.current}`;
  switch (change.kind) {
    case 'damage':
      return `Урон: ${creature.name} — ${change.amount}, ${hp}`;
    case 'heal':
      return `Лечение: ${creature.name} — ${change.amount}, ${hp}`;
    case 'temp':
      return `Временные хиты: ${creature.name} — ${change.amount}`;
  }
}

// «1 круг: 1 из 2, 2 круг: 0 из 1» — сколько ячеек осталось по кругам.
function slotsText(slots: SpellSlots) {
  const parts = Object.entries(slots).flatMap(([level, slot]) =>
    slot
      ? [`${level} круг: ${slot.total - slot.expended} из ${slot.total}`]
      : [],
  );
  return parts.length > 0 ? `осталось ${parts.join(', ')}` : 'ячеек нет';
}
