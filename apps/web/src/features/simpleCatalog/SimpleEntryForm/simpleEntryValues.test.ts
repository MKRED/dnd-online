import type { Ability, Effect } from 'shared';
import { describe, expect, it } from 'vitest';
import { ABILITIES, EFFECTS } from '../simpleCatalogs';
import { toSimpleFormValues, toSimpleInput } from './simpleEntryValues';

const effect: Effect = {
  id: 'e1',
  authorId: 'u1',
  authorNickname: 'Арвен',
  isPublic: false,
  name: 'Горение',
  components: [{ kind: 'sense', sense: 'darkvision', range: 60 }],
  duration: { kind: 'turn', edge: 'end', owner: 'bearer' },
  saveEnds: { ability: 'constitution', edge: 'start' },
  description: '',
  sources: ['https://next.dnd.su'],
  image: null,
  createdAt: '',
  updatedAt: '',
};

describe('simpleEntryValues', () => {
  it('эффект отправляет свои поля из формы, без категории', () => {
    const values = toSimpleFormValues(EFFECTS, effect);
    // Пустое поле и пробелы по краям в запрос не уходят.
    values.sources = [...values.sources, '  ', ' Книга игрока '];
    expect(toSimpleInput(EFFECTS, values)).toEqual({
      name: 'Горение',
      description: '',
      sources: ['https://next.dnd.su', 'Книга игрока'],
      isPublic: false,
      components: [{ kind: 'sense', sense: 'darkvision', range: 60 }],
      duration: { kind: 'turn', edge: 'end', owner: 'bearer' },
      saveEnds: { ability: 'constitution', edge: 'start' },
    });
  });

  it('способность отправляет категорию, активацию, затраты и шаги, а поля эффекта — нет', () => {
    const values = toSimpleFormValues(ABILITIES, null);
    expect(toSimpleInput(ABILITIES, { ...values, name: ' Луч ' })).toEqual({
      name: 'Луч',
      category: 'basic',
      details: {},
      description: '',
      sources: [],
      isPublic: false,
      activation: { kind: 'action' },
      costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
      steps: [],
      passive: [],
    });
  });

  // docs/plan/done/traits.md: составляющие черты — в полях эффекта формы.
  it('черта: составляющие туда и обратно, у другой активации — не уходят', () => {
    const passive = [
      { kind: 'sense' as const, sense: 'darkvision' as const, range: 120 },
    ];
    const trait: Ability = {
      id: 'a2',
      authorId: 'u1',
      authorNickname: 'Арвен',
      isPublic: false,
      name: 'Тёмное зрение',
      category: 'basic',
      details: {},
      activation: { kind: 'trait' },
      costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
      steps: [],
      passive,
      description: '',
      sources: [],
      image: null,
      createdAt: '',
      updatedAt: '',
    };
    const values = toSimpleFormValues(ABILITIES, trait);
    expect(toSimpleInput(ABILITIES, values)).toMatchObject({
      activation: { kind: 'trait' },
      passive,
    });
    const action = {
      ...values,
      usage: { ...values.usage, kind: 'action' as const },
    };
    expect(toSimpleInput(ABILITIES, action)).toMatchObject({ passive: [] });
  });

  it('способность монстра отправляет перезарядку и цену легендарного действия', () => {
    const ability: Ability = {
      id: 'a1',
      authorId: 'u1',
      authorNickname: 'Арвен',
      isPublic: false,
      name: 'Хлестнуть',
      category: 'monster',
      details: { recharge: 5 },
      activation: { kind: 'legendary', cost: 2 },
      costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
      steps: [],
      passive: [],
      description: '',
      sources: [],
      image: null,
      createdAt: '',
      updatedAt: '',
    };
    const values = toSimpleFormValues(ABILITIES, ability);
    expect(toSimpleInput(ABILITIES, values)).toMatchObject({
      category: 'monster',
      details: { recharge: 5 },
      activation: { kind: 'legendary', cost: 2 },
    });
    const none = { ...values, monster: { recharge: 'none' } };
    expect(toSimpleInput(ABILITIES, none)).toMatchObject({
      details: { recharge: null },
    });
  });
});
