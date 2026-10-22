import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { CharacterModelsController } from './character-models.controller.js';
import { CharacterModelsService } from './character-models.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [CharacterModelsController],
  providers: [CharacterModelsService],
})
export class CharacterModelsModule {}
