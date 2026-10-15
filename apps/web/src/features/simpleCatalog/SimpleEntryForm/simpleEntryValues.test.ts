import type { Effect } from 'shared';
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
  image: null,
  createdAt: '',
  updatedAt: '',
};

describe('simpleEntryValues', () => {
  it('эффект отправляет свои поля из формы, без категории', () => {
    const values = toSimpleFormValues(EFFECTS, effect);
    expect(toSimpleInput(EFFECTS, values)).toEqual({
      name: 'Горение',
      description: '',
      isPublic: false,
      components: [{ kind: 'sense', sense: 'darkvision', range: 60 }],
      duration: { kind: 'turn', edge: 'end', owner: 'bearer' },
      saveEnds: { ability: 'constitution', edge: 'start' },
    });
  });

  it('способность отправляет категорию, активацию и затраты, а поля эффекта — нет', () => {
    const values = toSimpleFormValues(ABILITIES, null);
    expect(toSimpleInput(ABILITIES, { ...values, name: ' Луч ' })).toEqual({
      name: 'Луч',
      category: 'basic',
      details: {},
      description: '',
      isPublic: false,
      activation: { kind: 'action' },
      costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
    });
  });
});
