import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service.js';
import { users } from '../database/schema/index.js';

type User = typeof users.$inferSelect;

export interface CreateUserInput {
  login: string;
  nickname: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(UsersService.name) private readonly logger: PinoLogger,
  ) {}

  // Без явного типа TypeScript выводит User, хотя `[user]` из пустой выборки — undefined.
  async findByLogin(login: string): Promise<User | undefined> {
    const t0 = Date.now();
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.login, login))
      .limit(1);
    this.logger.debug(
      { durationMs: Date.now() - t0, login, found: Boolean(user) },
      'User lookup by login',
    );
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const t0 = Date.now();
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    this.logger.debug(
      { durationMs: Date.now() - t0, id, found: Boolean(user) },
      'User lookup by id',
    );
    return user;
  }

  async createUser(input: CreateUserInput) {
    const t0 = Date.now();
    const [user] = await this.databaseService.db
      .insert(users)
      .values(input)
      .returning();
    this.logger.info(
      { durationMs: Date.now() - t0, login: input.login },
      'User created',
    );
    return user;
  }
}
