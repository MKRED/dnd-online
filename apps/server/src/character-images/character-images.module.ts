import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CharacterImageEditService } from './character-image-edit.service.js';
import { CharacterImagesController } from './character-images.controller.js';
import { CharacterImagesService } from './character-images.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CharacterImagesController],
  providers: [CharacterImagesService, CharacterImageEditService],
})
export class CharacterImagesModule {}
