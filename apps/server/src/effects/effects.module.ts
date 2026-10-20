import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { EffectsController } from './effects.controller.js';
import { EffectAbilitiesService } from './effect-abilities.service.js';
import { EffectsService } from './effects.service.js';
import { EffectImageEditService } from './effect-image-edit.service.js';
import { EffectImagesController } from './effect-images.controller.js';
import { EffectImagesService } from './effect-images.service.js';

// Каталог эффектов и их картинки (docs/plan/done/effects.md).
@Module({
  imports: [ApiTokensModule],
  controllers: [EffectsController, EffectImagesController],
  providers: [
    EffectsService,
    EffectImagesService,
    EffectImageEditService,
    EffectAbilitiesService,
  ],
})
export class EffectsModule {}
