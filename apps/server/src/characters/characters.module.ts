import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { GamesModule } from '../games/games.module.js';
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
import { EquipmentController, EquipmentService } from './equipment/index.js';
import { InventoryController, InventoryService } from './inventory/index.js';

@Module({
  imports: [ApiTokensModule, GamesModule],
  controllers: [
    CharactersController,
    InventoryController,
    EquipmentController,
    CharacterEffectsController,
    CharacterAbilitiesController,
  ],
  providers: [
    CharactersService,
    CharacterAccessService,
    InventoryService,
    EquipmentService,
    CharacterEffectsService,
    CharacterAbilitiesService,
  ],
})
export class CharactersModule {}
