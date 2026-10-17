import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CharacterAccessService } from './character-access.service.js';
import { CharactersController } from './characters.controller.js';
import { CharactersService } from './characters.service.js';
import {
  CharacterEffectsController,
  CharacterEffectsService,
} from './effects/index.js';
import { InventoryController, InventoryService } from './inventory/index.js';

@Module({
  imports: [AuthModule],
  controllers: [
    CharactersController,
    InventoryController,
    CharacterEffectsController,
  ],
  providers: [
    CharactersService,
    CharacterAccessService,
    InventoryService,
    CharacterEffectsService,
  ],
})
export class CharactersModule {}
