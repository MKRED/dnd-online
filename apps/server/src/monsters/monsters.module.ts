import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import {
  MonsterAbilitiesController,
  MonsterAbilitiesService,
} from './abilities/index.js';
import { MonsterImageEditService } from './monster-image-edit.service.js';
import { MonsterImagesController } from './monster-images.controller.js';
import { MonsterImagesService } from './monster-images.service.js';
import { MonstersController } from './monsters.controller.js';
import { MonstersService } from './monsters.service.js';

// Каталог монстров, их картинки и способности (docs/plan/monsters-npcs.md).
@Module({
  imports: [AuthModule],
  controllers: [
    MonstersController,
    MonsterImagesController,
    MonsterAbilitiesController,
  ],
  providers: [
    MonstersService,
    MonsterImagesService,
    MonsterImageEditService,
    MonsterAbilitiesService,
  ],
})
export class MonstersModule {}
