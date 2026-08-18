import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service';
import { users } from '../database/schema';

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

  async findByLogin(login: string) {
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

  async findById(id: string) {
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
