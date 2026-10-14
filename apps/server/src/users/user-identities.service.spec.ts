import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PinoLogger } from 'nestjs-pino';
import type { DatabaseService } from '../database/database.service.js';
import { UserIdentitiesService } from './user-identities.service.js';

const existing = { id: 'u1', login: 'lolka_00000000', nickname: 'Арвен' };
const identity = { provider: 'lolka', subject: 's-1', nickname: '  Арвен  ' };

describe('UserIdentitiesService', () => {
  // Ответы select по очереди: [] — связи нет, [{ user }] — есть.
  let selectResults: unknown[][];
  let inserted: Record<string, unknown>[];
  let transaction: ReturnType<typeof vi.fn>;
  let service: UserIdentitiesService;

  beforeEach(() => {
    selectResults = [];
    inserted = [];
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(selectResults.shift() ?? []),
    };
    const tx = {
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          inserted.push(values);
          const done = Promise.resolve();
          return Object.assign(done, {
            returning: () => Promise.resolve([{ id: 'new-id', ...values }]),
          });
        },
      }),
    };
    transaction = vi.fn((fn: (t: typeof tx) => unknown) => fn(tx));
    const db = { select: () => chain, transaction };
    service = new UserIdentitiesService(
      { db } as unknown as DatabaseService,
      {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      } as unknown as PinoLogger,
    );
  });

  it('returns the linked user without creating anything', async () => {
    selectResults = [[{ user: existing }]];
    await expect(service.findOrCreateUser(identity)).resolves.toEqual({
      user: existing,
      created: false,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('creates a passwordless user with a technical login and links it', async () => {
    const { user, created } = await service.findOrCreateUser(identity);

    expect(created).toBe(true);
    expect(user).toMatchObject({ nickname: 'Арвен', passwordHash: null });
    expect(user.login).toMatch(/^lolka_[0-9a-f]{8}$/);
    expect(inserted[1]).toEqual({
      userId: 'new-id',
      provider: 'lolka',
      subject: 's-1',
    });
  });

  it('falls back to a default nickname when lolka gives none', async () => {
    const { user } = await service.findOrCreateUser({
      ...identity,
      nickname: ' ',
    });
    expect(user.nickname).toBe('Игрок');
  });

  it('takes the account created by a parallel first sign-in', async () => {
    selectResults = [[], [{ user: existing }]];
    transaction.mockRejectedValue(
      Object.assign(new Error('insert failed'), { cause: { code: '23505' } }),
    );
    await expect(service.findOrCreateUser(identity)).resolves.toEqual({
      user: existing,
      created: false,
    });
  });

  it('rethrows other database errors', async () => {
    transaction.mockRejectedValue(new Error('db down'));
    await expect(service.findOrCreateUser(identity)).rejects.toThrow('db down');
  });
});
