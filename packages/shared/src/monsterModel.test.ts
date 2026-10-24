import { describe, expect, it } from 'vitest';
import { isMonsterModelLink, readMonsterModelLink } from './monsterModel.js';

const id = '00000000-0000-4000-8000-000000000001';

describe('ссылка монстра на модель', () => {
  it('принимает id модели и множитель в пределах', () => {
    expect(isMonsterModelLink({ id, scale: 1 })).toBe(true);
    expect(isMonsterModelLink({ id, scale: 0.25 })).toBe(true);
    expect(isMonsterModelLink({ id, scale: 4 })).toBe(true);
  });

  it('отклоняет множитель вне пределов, не-uuid и лишние ключи', () => {
    expect(isMonsterModelLink({ id, scale: 0.2 })).toBe(false);
    expect(isMonsterModelLink({ id, scale: 5 })).toBe(false);
    expect(isMonsterModelLink({ id: 'x', scale: 1 })).toBe(false);
    expect(isMonsterModelLink({ id, scale: 1, color: '#fff' })).toBe(false);
    expect(isMonsterModelLink(null)).toBe(false);
  });

  it('испорченную ссылку читает как «без модели»', () => {
    expect(readMonsterModelLink({ id, scale: 2 })).toEqual({ id, scale: 2 });
    expect(readMonsterModelLink({ id })).toBeNull();
    expect(readMonsterModelLink(undefined)).toBeNull();
  });
});
