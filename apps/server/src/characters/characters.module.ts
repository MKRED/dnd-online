import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import {
  CharacterAbilitiesController,
  CharacterAbilitiesService,
} from './abilities/index.js';
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
    CharacterAbilitiesController,
  ],
  providers: [
    CharactersService,
    CharacterAccessService,
    InventoryService,
    CharacterEffectsService,
    CharacterAbilitiesService,
  ],
})
export class CharactersModule {}
