import { describe, expect, it } from 'vitest';
import type { CharacterEffectEntry } from './characterEffects.js';
import type { EffectComponent } from './effectComponents.js';
import { sheetTotals } from './sheetTotals.js';

const entry = (
  name: string,
  components: EffectComponent[],
  over: Partial<{ inactive: boolean }> = {},
): CharacterEffectEntry => ({
  id: `row-${name}`,
  effect: {
    id: `effect-${name}`,
    name,
    isPublic: true,
    image: null,
    components,
    duration: { kind: 'permanent' },
    saveEnds: null,
  },
  missing: null,
  inactive: over.inactive ?? false,
});
const haste = entry('Ускорение', [
  { kind: 'speed', change: 'double', feet: null, hover: false },
]);
const grappled = entry('Захват', [
  { kind: 'condition', condition: 'grappled' },
]);
// КД 14, Ловкость 16 (+3).
const abilityScores = {
  strength: 10,
  dexterity: 16,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};
const totals = (...effects: CharacterEffectEntry[]) =>
  sheetTotals({ speed: 30, armorClass: 14, abilityScores, effects });

describe('sheetTotals', () => {
  it('без эффектов — база и пустые списки', () => {
    expect(totals()).toEqual({
      speed: { speed: 30, special: {}, hover: false },
      speedChanges: [],
      armorClass: 14,
      armorClassChanges: [],
      conditions: [],
      defenses: [],
      senses: [],
      rolls: [],
      noHealing: [],
      perTurn: [],
    });
  });

  it('Скорость под Ускорением, затем с захватом — 0, и почему', () => {
    expect(totals(haste).speed.speed).toBe(60);
    const both = totals(haste, grappled);
    expect(both.speed.speed).toBe(0);
    expect(both.speedChanges).toEqual([
      { text: 'Скорость вдвое больше', from: ['Ускорение'] },
      { text: 'Скорость 0', from: ['Схваченный'] },
    ]);
    expect(both.conditions).toEqual([{ kind: 'grappled', from: ['Захват'] }]);
    expect(both.rolls).toEqual([
      {
        text: 'Помеха на свои броски атаки, кроме как по наложившему',
        from: ['Схваченный'],
      },
    ]);
  });

  it('КД: итог и что его изменило', () => {
    const faith = entry('Щит веры', [
      { kind: 'armor_class', change: 'bonus', value: 2 },
    ]);
    const mage = entry('Доспехи мага', [
      { kind: 'armor_class', change: 'base', value: 13 },
    ]);
    const t = totals(faith, mage);
    expect(t.armorClass).toBe(18);
    expect(t.armorClassChanges).toEqual([
      { text: 'КД +2', from: ['Щит веры'] },
      { text: 'Базовый КД 13 + модификатор Ловкости', from: ['Доспехи мага'] },
    ]);
  });

  it('скрытый, удалённый и не действующий эффект на лист не влияют', () => {
    const hidden: CharacterEffectEntry = {
      id: 'row-x',
      effect: null,
      missing: 'hidden',
    };
    const inactive = entry(
      'Чужое ускорение',
      [{ kind: 'speed', change: 'double', feet: null, hover: false }],
      { inactive: true },
    );
    expect(totals(hidden, inactive)).toEqual(totals());
  });

  it('включённые состояния — от состояния, которое их включает', () => {
    const sleep = entry('Сон', [
      { kind: 'condition', condition: 'unconscious' },
    ]);
    const shove = entry('Толчок', [{ kind: 'condition', condition: 'prone' }]);
    expect(totals(sleep, shove).conditions).toEqual([
      { kind: 'incapacitated', from: ['Бессознательный'] },
      { kind: 'prone', from: ['Бессознательный', 'Толчок'] },
      { kind: 'unconscious', from: ['Сон'] },
    ]);
  });

  it('иммунитет к состоянию убирает его и его броски', () => {
    const freedom = entry('Свобода', [
      {
        kind: 'defense',
        level: 'immunity',
        damageTypes: [],
        conditions: ['grappled'],
      },
    ]);
    const t = totals(grappled, freedom);
    expect(t.conditions).toEqual([]);
    expect(t.rolls).toEqual([]);
    expect(t.speed.speed).toBe(30);
    expect(t.defenses).toEqual([
      { level: 'immunity', text: 'Схваченный', from: ['Свобода'] },
    ]);
  });

  it('списки без повторов: защита, чувства с наибольшей дальностью, броски', () => {
    const fire = entry('Огнеупорность', [
      {
        kind: 'defense',
        level: 'resistance',
        damageTypes: ['fire', 'cold'],
        conditions: [],
      },
      { kind: 'sense', sense: 'darkvision', range: 60 },
      {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'save',
        ability: 'dexterity',
        when: null,
      },
    ]);
    const elf = entry('Эльф', [
      {
        kind: 'defense',
        level: 'resistance',
        damageTypes: ['fire'],
        conditions: [],
      },
      { kind: 'sense', sense: 'darkvision', range: 120 },
      {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'save',
        ability: 'dexterity',
        when: null,
      },
      { kind: 'no_healing' },
    ]);
    const t = totals(fire, elf);
    expect(t.defenses).toEqual([
      { level: 'resistance', text: 'Огонь', from: ['Огнеупорность', 'Эльф'] },
      { level: 'resistance', text: 'Холод', from: ['Огнеупорность'] },
    ]);
    expect(t.senses).toEqual([
      { text: 'Тёмное зрение, 120 фт.', from: ['Огнеупорность', 'Эльф'] },
    ]);
    expect(t.rolls).toEqual([
      {
        text: 'Преимущество на спасброски Ловкости',
        from: ['Огнеупорность', 'Эльф'],
      },
    ]);
    expect(t.noHealing).toEqual(['Эльф']);
  });

  it('преимущество и помеха на одни броски — две строки', () => {
    const a = entry('А', [
      {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'attack',
        ability: null,
        when: null,
      },
    ]);
    const b = entry('Б', [
      {
        kind: 'advantage',
        mode: 'disadvantage',
        roll: 'attack',
        ability: null,
        when: null,
      },
    ]);
    expect(totals(a, b).rolls.map((l) => l.from)).toEqual([['А'], ['Б']]);
  });
});
