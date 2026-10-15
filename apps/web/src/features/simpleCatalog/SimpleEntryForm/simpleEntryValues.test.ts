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
  category: 'basic',
  details: {},
  duration: { kind: 'turn', edge: 'end', owner: 'bearer' },
  description: '',
  image: null,
  createdAt: '',
  updatedAt: '',
};

describe('simpleEntryValues', () => {
  it('эффект отправляет длительность из формы', () => {
    const values = toSimpleFormValues(EFFECTS, effect);
    expect(toSimpleInput(EFFECTS, values)).toEqual({
      name: 'Горение',
      category: 'basic',
      details: {},
      description: '',
      isPublic: false,
      duration: { kind: 'turn', edge: 'end', owner: 'bearer' },
    });
  });

  it('способность отправляет активацию и затраты, а длительность — нет', () => {
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
