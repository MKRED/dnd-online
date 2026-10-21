import { describe, expect, it } from 'vitest';
import { blockTraits } from './blockTraits';

describe('blockTraits', () => {
  it('у обычного блока подписи нет', () => {
    expect(blockTraits('stone')).toBeNull();
    expect(blockTraits('нет-такого')).toBeNull();
  });

  it('лёд и вода — труднопроходимые, лава ещё и опасная', () => {
    expect(blockTraits('water_slab')).toBe(
      'Труднопроходимый: шаг стоит 10 футов.',
    );
    expect(blockTraits('lava')).toMatch(
      /^Опасный: 10к10 \(Огонь\) — тому, кто впервые за ход входит на блок или начинает на нём ход\. Труднопроходимый/,
    );
  });
});
