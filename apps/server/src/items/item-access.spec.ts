import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { DatabaseService } from '../database/database.service.js';
import { rejectEdit } from './item-access.js';

// Подменяем только цепочку select → from → where → limit: условие видимости проверяет
// сама база, здесь — что делает rejectEdit с её ответом.
function fakeDb(visibleRows: { id: string }[]) {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(visibleRows),
  };
  return chain as unknown as DatabaseService['db'];
}

describe('rejectEdit', () => {
  it('чужой опубликованный предмет — 403', async () => {
    await expect(
      rejectEdit(fakeDb([{ id: 'i1' }]), 'u2', 'i1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('чужой скрытый или несуществующий — 404', async () => {
    await expect(rejectEdit(fakeDb([]), 'u2', 'i1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
