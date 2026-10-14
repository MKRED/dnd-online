import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CharacterAccessService } from './character-access.service.js';
import { CharactersController } from './characters.controller.js';
import { CharactersService } from './characters.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CharactersController],
  providers: [CharactersService, CharacterAccessService],
})
export class CharactersModule {}
