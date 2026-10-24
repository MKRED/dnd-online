import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { PinoLogger } from 'nestjs-pino';
import type { UserIdentitiesService } from '../../users/user-identities.service.js';
import type { UsersService } from '../../users/users.service.js';
import type { AuthService } from '../auth.service.js';
import { ProfileService } from './profile.service.js';

describe('ProfileService', () => {
  let user: {
    id: string;
    login: string;
    nickname: string;
    passwordHash: string | null;
    createdAt: Date;
  };
  let users: {
    findById: ReturnType<typeof vi.fn>;
    setCredentials: Mock<UsersService['setCredentials']>;
    updatePassword: Mock<UsersService['updatePassword']>;
    updateNickname: Mock<UsersService['updateNickname']>;
  };
  let service: ProfileService;

  beforeEach(() => {
    user = {
      id: 'u1',
      login: 'lolka_ab12cd34',
      nickname: 'Арвен',
      passwordHash: null,
      createdAt: new Date('2026-09-14T10:00:00Z'),
    };
    users = {
      findById: vi.fn(() => Promise.resolve(user)),
      setCredentials: vi.fn<UsersService['setCredentials']>(),
      updatePassword: vi.fn<UsersService['updatePassword']>(),
      updateNickname: vi.fn<UsersService['updateNickname']>(),
    };
    service = new ProfileService(
      users as unknown as UsersService,
      {
        providersOf: vi.fn().mockResolvedValue(['lolka']),
      } as unknown as UserIdentitiesService,
      {
        signIn: vi.fn().mockResolvedValue({
          tokens: { accessToken: 'a', refreshToken: 'r' },
        }),
      } as unknown as AuthService,
      { warn: vi.fn(), error: vi.fn() } as unknown as PinoLogger,
    );
  });

  it('hides the technical login of an account without a password', async () => {
    await expect(service.getProfile('u1')).resolves.toEqual({
      login: null,
      nickname: 'Арвен',
      hasPassword: false,
      providers: ['lolka'],
      createdAt: '2026-09-14T10:00:00.000Z',
    });
  });

  it('changes the nickname and returns the fresh profile', async () => {
    users.updateNickname.mockImplementation((_id, nickname) => {
      user = { ...user, nickname };
      return Promise.resolve(true);
    });
    await expect(
      service.changeNickname('u1', { nickname: 'mk red' }),
    ).resolves.toMatchObject({ nickname: 'mk red' });
    expect(users.updateNickname).toHaveBeenCalledWith('u1', 'mk red');
  });

  it('sets login and password and issues fresh tokens', async () => {
    users.setCredentials.mockImplementation((_id, login, hash) => {
      user = { ...user, login, passwordHash: hash };
      return Promise.resolve(true);
    });
    const { profile, tokens } = await service.setCredentials('u1', {
      login: 'arwen',
      password: 'secret123',
    });

    const [, , hash] = users.setCredentials.mock.calls[0];
    expect(await bcrypt.compare('secret123', hash)).toBe(true);
    expect(profile).toMatchObject({ login: 'arwen', hasPassword: true });
    expect(tokens).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  it('refuses a taken login with a readable message', async () => {
    users.setCredentials.mockRejectedValue(
      Object.assign(new Error('dup'), { cause: { code: '23505' } }),
    );
    await expect(
      service.setCredentials('u1', { login: 'taken', password: 'secret123' }),
    ).rejects.toThrow(new ConflictException('Этот логин уже занят'));
  });

  it('refuses to overwrite an existing password', async () => {
    users.setCredentials.mockResolvedValue(false);
    await expect(
      service.setCredentials('u1', { login: 'arwen', password: 'secret123' }),
    ).rejects.toThrow(ConflictException);
  });

  it('changes the password only with the right current one', async () => {
    user.passwordHash = await bcrypt.hash('old-pass', 4);

    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrong',
        newPassword: 'new-pass',
      }),
    ).rejects.toThrow(new BadRequestException('Неверный текущий пароль'));
    expect(users.updatePassword).not.toHaveBeenCalled();

    await service.changePassword('u1', {
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    });
    const [, hash] = users.updatePassword.mock.calls[0];
    expect(await bcrypt.compare('new-pass', hash)).toBe(true);
  });

  it('refuses a password change for an account without a password', async () => {
    await expect(
      service.changePassword('u1', {
        currentPassword: 'x',
        newPassword: 'new-pass',
      }),
    ).rejects.toThrow(new BadRequestException('Пароль ещё не задан'));
  });
});
