import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import { PackContentsService } from './pack-contents/index.js';

@Module({
  imports: [AuthModule],
  controllers: [ItemsController],
  providers: [ItemsService, PackContentsService],
})
export class ItemsModule {}
