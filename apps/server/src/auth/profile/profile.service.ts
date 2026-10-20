import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { readUserSettings, type UserSettings } from 'shared';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  isUniqueViolation,
  UserIdentitiesService,
} from '../../users/user-identities.service.js';
import { UsersService } from '../../users/users.service.js';
import {
  AuthService,
  PASSWORD_SALT_ROUNDS,
  type AuthTokens,
} from '../auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { SetCredentialsDto } from './dto/set-credentials.dto.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

export interface Profile {
  // null — пароля нет (аккаунт из лольки): технический логин показывать незачем.
  login: string | null;
  nickname: string;
  hasPassword: boolean;
  // Внешние способы входа: ['lolka'].
  providers: string[];
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly identities: UserIdentitiesService,
    private readonly authService: AuthService,
    @InjectPinoLogger(ProfileService.name) private readonly logger: PinoLogger,
  ) {}

  async getProfile(userId: string): Promise<Profile> {
    const user = await this.requireUser(userId);
    const hasPassword = user.passwordHash !== null;
    return {
      login: hasPassword ? user.login : null,
      nickname: user.nickname,
      hasPassword,
      providers: await this.identities.providersOf(userId),
    };
  }

  // Аккаунт из лольки получает свои логин и пароль. Логин сменился, а он лежит в JWT —
  // поэтому выдаём сессии новые токены.
  async setCredentials(
    userId: string,
    dto: SetCredentialsDto,
  ): Promise<{ profile: Profile; tokens: AuthTokens }> {
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    let updated: boolean;
    try {
      updated = await this.usersService.setCredentials(
        userId,
        dto.login,
        passwordHash,
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Этот логин уже занят');
      }
      this.logger.error({ err, userId }, 'Failed to set credentials');
      throw err;
    }
    if (!updated) {
      throw new ConflictException('Логин и пароль уже заданы');
    }
    const user = await this.requireUser(userId);
    const { tokens } = await this.authService.signIn(user);
    return { profile: await this.getProfile(userId), tokens };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.requireUser(userId);
    if (user.passwordHash === null) {
      throw new BadRequestException('Пароль ещё не задан');
    }
    // 400, а не 401: на 401 веб решил бы, что истекла сессия, и пошёл бы её обновлять.
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      this.logger.warn(
        { userId },
        'Password change with a wrong current password',
      );
      throw new BadRequestException('Неверный текущий пароль');
    }
    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      PASSWORD_SALT_ROUNDS,
    );
    await this.usersService.updatePassword(userId, passwordHash);
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const user = await this.requireUser(userId);
    return readUserSettings(user.settings);
  }

  // Меняются только переданные поля, остальные настройки остаются как были.
  async updateSettings(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<UserSettings> {
    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const settings = await this.usersService.mergeSettings(userId, patch);
    if (!settings) throw new UnauthorizedException();
    return readUserSettings(settings);
  }

  private async requireUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
