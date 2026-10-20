import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import {
  MonsterAbilitiesController,
  MonsterAbilitiesService,
} from './abilities/index.js';
import {
  MonsterEffectsController,
  MonsterEffectsService,
} from './effects/index.js';
import { MonsterItemsController, MonsterItemsService } from './items/index.js';
import { MonsterImageEditService } from './monster-image-edit.service.js';
import { MonsterImagesController } from './monster-images.controller.js';
import { MonsterImagesService } from './monster-images.service.js';
import { MonstersController } from './monsters.controller.js';
import { MonstersService } from './monsters.service.js';

// Каталог монстров, их картинки, способности, снаряжение и эффекты (docs/plan/done/monsters-npcs.md).
@Module({
  imports: [ApiTokensModule],
  controllers: [
    MonstersController,
    MonsterImagesController,
    MonsterAbilitiesController,
    MonsterItemsController,
    MonsterEffectsController,
  ],
  providers: [
    MonstersService,
    MonsterImagesService,
    MonsterImageEditService,
    MonsterAbilitiesService,
    MonsterItemsService,
    MonsterEffectsService,
  ],
})
export class MonstersModule {}
