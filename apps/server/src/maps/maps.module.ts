import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { MapContentController } from './map-content.controller.js';
import { MapEditService } from './map-edit.service.js';
import { MapLimitsConfig } from './map-limits.js';
import { MapReadService } from './map-read.service.js';
import { MapsController } from './maps.controller.js';
import { MapsService } from './maps.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [MapsController, MapContentController],
  providers: [MapsService, MapEditService, MapReadService, MapLimitsConfig],
})
export class MapsModule {}
