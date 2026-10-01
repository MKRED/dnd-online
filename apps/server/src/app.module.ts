import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CharactersModule } from './characters/characters.module.js';
import { DatabaseModule } from './database/database.module.js';
import { MapsModule } from './maps/maps.module.js';
import { UsersModule } from './users/users.module.js';
import { webAppModules } from './web-app.module.js';

const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL ?? 'info';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CharactersModule,
    MapsModule,
    ...webAppModules(),
    LoggerModule.forRoot({
      pinoHttp: {
        level,
        // Cookie-заголовки несут access/refresh JWT — без redact они утекали бы в логи в открытом виде.
        redact: {
          paths: ['req.headers.cookie', 'res.headers["set-cookie"]'],
          censor: '[REDACTED]',
        },
        transport: {
          targets: [
            isProduction
              ? { target: 'pino/file', level, options: { destination: 1 } }
              : { target: 'pino-pretty', level, options: { singleLine: true } },
            {
              target: 'pino-pretty',
              level,
              options: {
                destination: join(process.cwd(), 'logs', 'app.log'),
                mkdir: true,
                colorize: false,
                singleLine: true,
              },
            },
          ],
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
