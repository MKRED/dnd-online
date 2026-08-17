import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL ?? 'info';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level,
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
