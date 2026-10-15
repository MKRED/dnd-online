import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AbilitiesController } from './abilities.controller.js';
import { AbilitiesService } from './abilities.service.js';
import { AbilityImageEditService } from './ability-image-edit.service.js';
import { AbilityImagesController } from './ability-images.controller.js';
import { AbilityImagesService } from './ability-images.service.js';

// Каталог способностей и их картинки (docs/plan/abilities.md).
@Module({
  imports: [AuthModule],
  controllers: [AbilitiesController, AbilityImagesController],
  providers: [AbilitiesService, AbilityImagesService, AbilityImageEditService],
})
export class AbilitiesModule {}
