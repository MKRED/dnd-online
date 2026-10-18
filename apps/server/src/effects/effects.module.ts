import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EffectsController } from './effects.controller.js';
import { EffectAbilitiesService } from './effect-abilities.service.js';
import { EffectsService } from './effects.service.js';
import { EffectImageEditService } from './effect-image-edit.service.js';
import { EffectImagesController } from './effect-images.controller.js';
import { EffectImagesService } from './effect-images.service.js';

// Каталог эффектов и их картинки (docs/plan/effects.md).
@Module({
  imports: [AuthModule],
  controllers: [EffectsController, EffectImagesController],
  providers: [
    EffectsService,
    EffectImagesService,
    EffectImageEditService,
    EffectAbilitiesService,
  ],
})
export class EffectsModule {}
