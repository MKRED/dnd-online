import { describe, expect, it } from 'vitest';
import {
  PACK_IN_PACK,
  PACK_ITEM_NOT_FOUND,
  packContentsError,
} from './pack-contents.rules.js';

describe('packContentsError', () => {
  it('пускает видимые предметы не-наборы', () => {
    expect(
      packContentsError(
        ['a', 'b'],
        [
          { id: 'a', category: 'basic' },
          { id: 'b', category: 'container' },
        ],
      ),
    ).toBeNull();
  });

  it('не находит предмет, которого автор набора не видит', () => {
    expect(
      packContentsError(['a', 'b'], [{ id: 'a', category: 'basic' }]),
    ).toBe(PACK_ITEM_NOT_FOUND);
  });

  it('не пускает набор в набор', () => {
    expect(packContentsError(['a'], [{ id: 'a', category: 'pack' }])).toBe(
      PACK_IN_PACK,
    );
  });
});
