import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(DatabaseService.name) private readonly logger: PinoLogger,
  ) {
    this.pool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });
    this.db = drizzle(this.pool, { schema });
  }

  // Проверяем соединение сразу при старте, чтобы падать быстро, а не при первом запросе от клиента.
  async onModuleInit(): Promise<void> {
    const t0 = Date.now();
    try {
      await this.db.execute(sql`select 1`);
      this.logger.info(
        { durationMs: Date.now() - t0 },
        'Database connection established',
      );
    } catch (err: unknown) {
      this.logger.error({ err }, 'Database connection failed');
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
