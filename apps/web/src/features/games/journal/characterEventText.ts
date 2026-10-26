import type { GameEventPayloads, SpellSlots } from 'shared';
import { SLOT_FULL_NAMES } from '../../characters/Equipment/equipmentView';

type CharacterChanged = GameEventPayloads['character.changed'];
type CreatureChanged = GameEventPayloads['creature.changed'];
type CreatureSlots = GameEventPayloads['creature.slots_changed'];
type Equipment = GameEventPayloads['character.equipment'];

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

// Ячейки экземпляра НПС (вариант А после первой партии) — как у персонажа.
export function creatureSlotsText({ result }: CreatureSlots) {
  return `Ячейки заклинаний: ${result.creature.name} — ${slotsText(result.after)}`;
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

// Кукла в игре (docs/plan/equipment.md, этап 4): что надели, сняли или настроили.
export function equipmentEventText({ intent, result }: Equipment): string {
  const { character, item } = result;
  const { change } = intent;
  const what = item ? ` — ${item.name}` : '';
  switch (change.kind) {
    case 'equip':
      return `Надето: ${character.name}${what} (${SLOT_FULL_NAMES[change.slot]})`;
    case 'unequip':
      return `Снято: ${character.name}${what} (${SLOT_FULL_NAMES[change.slot]})`;
    case 'attune':
      return `Настройка: ${character.name}${what}`;
    case 'end_attunement':
      return `Настройка снята: ${character.name}${what}`;
  }
}
