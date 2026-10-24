import { describe, expect, it } from 'vitest';
import type { AbilityActivation } from './abilityUsage.js';
import type { CharacterAbilityEntry } from './characterAbilities.js';
import type { CharacterEffectEntry } from './characterEffects.js';
import type { EffectComponent } from './effectComponents.js';
import { creatureTotals, sheetTotals } from './sheetTotals.js';

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
  sheetTotals({
    speed: 30,
    armorClass: 14,
    abilityScores,
    effects,
    abilities: [],
  });

// Способность на листе: черта с составляющими или обычная.
const ability = (
  name: string,
  passive: EffectComponent[],
  over: Partial<{ inactive: boolean; activation: AbilityActivation }> = {},
): CharacterAbilityEntry => ({
  id: `row-${name}`,
  prepared: false,
  ability: {
    id: `ability-${name}`,
    name,
    isPublic: true,
    image: null,
    category: 'basic',
    level: null,
    activation: over.activation ?? { kind: 'trait' },
    costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
    recharge: null,
    passive,
  },
  missing: null,
  inactive: over.inactive ?? false,
});

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
      perception: { shift: 0, lines: [] },
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

  it('бонусы к броскам разных эффектов — отдельными строками: они складываются', () => {
    const plus = {
      kind: 'roll_bonus',
      mode: 'bonus',
      roll: 'attack',
      ability: null,
      count: 1,
      die: 4,
      number: 0,
      damageType: null,
    } as const;
    const bless = entry('Благословение', [plus]);
    const other = entry('Боевой гимн', [plus]);
    expect(totals(bless, other).rolls).toEqual([
      { text: '+1d4 к своим броскам атаки', from: ['Благословение'] },
      { text: '+1d4 к своим броскам атаки', from: ['Боевой гимн'] },
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

// docs/plan/done/monsters-npcs.md, этап 6: у монстра особые скорости есть без эффектов.
describe('creatureTotals', () => {
  const base = {
    speed: { speed: 10, special: { swim: 40 }, hover: false },
    armorClass: 17,
    dexterity: 9,
  };

  it('особые скорости базы остаются и меняются вместе со Скоростью', () => {
    const shield = entry('Щит веры', [
      { kind: 'armor_class', change: 'bonus', value: 2 },
    ]);
    expect(creatureTotals(base, [shield])).toMatchObject({
      speed: { speed: 10, special: { swim: 40 }, hover: false },
      armorClass: 19,
    });
    expect(creatureTotals(base, [haste]).speed).toEqual({
      speed: 20,
      special: { swim: 80 },
      hover: false,
    });
  });
});

describe('черты', () => {
  const defense = ability('Защитный бой', [
    { kind: 'armor_class', change: 'bonus', value: 1 },
  ]);
  const resilience = ability('Дварфийская стойкость', [
    {
      kind: 'defense',
      level: 'resistance',
      damageTypes: ['poison'],
      conditions: [],
    },
  ]);
  const sheet = (
    abilities: CharacterAbilityEntry[],
    effects: CharacterEffectEntry[] = [],
  ) =>
    sheetTotals({
      speed: 30,
      armorClass: 14,
      abilityScores,
      effects,
      abilities,
    });

  it('считаются в итоге и названы своим именем', () => {
    const result = sheet([defense, resilience]);
    expect(result.armorClass).toBe(15);
    expect(result.armorClassChanges).toEqual([
      { text: 'КД +1', from: ['Защитный бой'] },
    ]);
    expect(result.defenses).toEqual([
      { level: 'resistance', text: 'Яд', from: ['Дварфийская стойкость'] },
    ]);
  });

  it('остаются, когда эффекты не считаются (вид «Без эффектов»)', () => {
    const character = {
      speed: 30,
      armorClass: 14,
      abilityScores,
      effects: [haste],
      abilities: [defense],
    };
    const base = sheetTotals(character, []);
    expect(base.armorClass).toBe(15);
    expect(base.speed.speed).toBe(30);
    expect(sheetTotals(character).speed.speed).toBe(60);
  });

  it('складываются с эффектами', () => {
    const faith = entry('Щит веры', [
      { kind: 'armor_class', change: 'bonus', value: 2 },
    ]);
    expect(sheet([defense], [faith]).armorClass).toBe(17);
  });

  it('скрытая от владельца черта и составляющие не у черты не действуют', () => {
    const hidden = ability(
      'Скрытая',
      [{ kind: 'armor_class', change: 'bonus', value: 3 }],
      { inactive: true },
    );
    const action = ability(
      'Действие',
      [{ kind: 'armor_class', change: 'bonus', value: 3 }],
      { activation: { kind: 'action' } },
    );
    expect(sheet([hidden, action]).armorClass).toBe(14);
  });
});
