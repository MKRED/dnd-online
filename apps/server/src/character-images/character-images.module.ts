import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { CharacterImageEditService } from './character-image-edit.service.js';
import { CharacterImagesController } from './character-images.controller.js';
import { CharacterImagesService } from './character-images.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [CharacterImagesController],
  providers: [CharacterImagesService, CharacterImageEditService],
})
export class CharacterImagesModule {}
