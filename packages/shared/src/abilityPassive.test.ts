import { describe, expect, it } from 'vitest';
import { passiveFitsActivation } from './abilityPassive.js';

describe('passiveFitsActivation', () => {
  const dark = { kind: 'sense', sense: 'darkvision', range: 60 };

  it('составляющие — только у черты, пустой список — у любой активации', () => {
    expect(passiveFitsActivation({ kind: 'trait' }, [dark])).toBe(true);
    expect(passiveFitsActivation({ kind: 'action' }, [dark])).toBe(false);
    expect(passiveFitsActivation({ kind: 'action' }, [])).toBe(true);
    expect(passiveFitsActivation({ kind: 'trait' }, [])).toBe(true);
  });
});
