import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { ItemHoldersService } from './item-holders.service.js';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import {
  PackContentsService,
  PackUsageService,
} from './pack-contents/index.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [ItemsController],
  providers: [
    ItemsService,
    PackContentsService,
    PackUsageService,
    ItemHoldersService,
  ],
})
export class ItemsModule {}
