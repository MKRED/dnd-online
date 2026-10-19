import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createPalette, DEFAULT_MAP_SIZE } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { maps } from '../database/schema/index.js';
import type { CreateMapDto } from './dto/create-map.dto.js';
import { MAP_NOT_FOUND } from './map-access.js';
import { MapLimitsConfig } from './map-limits.js';
import { toMapInfo } from './maps.mapper.js';

// Карты как записи: создание, список, переименование, удаление. Блоки — MapEditService.
@Injectable()
export class MapsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly limits: MapLimitsConfig,
    @InjectPinoLogger(MapsService.name) private readonly logger: PinoLogger,
  ) {}

  async create(ownerId: string, dto: CreateMapDto) {
    const width = dto.width ?? DEFAULT_MAP_SIZE.width;
    const depth = dto.depth ?? DEFAULT_MAP_SIZE.depth;
    // Предел — из конфига, поэтому проверяется здесь, а не декоратором DTO.
    if (width > this.limits.maxSize || depth > this.limits.maxSize) {
      throw new BadRequestException(
        `Ширина и глубина карты — от 1 до ${this.limits.maxSize} клеток`,
      );
    }
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .insert(maps)
        .values({
          ownerId,
          name: dto.name,
          palette: createPalette(),
          width,
          depth,
        })
        .returning();
      this.logger.info(
        { durationMs: Date.now() - t0, ownerId, mapId: row.id },
        'Map created',
      );
      return toMapInfo(row);
    } catch (err: unknown) {
      this.logger.error({ err, ownerId }, 'Map creation failed');
      throw err;
    }
  }

  async findAllForOwner(ownerId: string) {
    const t0 = Date.now();
    try {
      const rows = await this.databaseService.db
        .select()
        .from(maps)
        .where(eq(maps.ownerId, ownerId))
        .orderBy(desc(maps.updatedAt), desc(maps.createdAt));
      this.logger.debug(
        { durationMs: Date.now() - t0, ownerId, count: rows.length },
        'Maps listed',
      );
      return rows.map(toMapInfo);
    } catch (err: unknown) {
      this.logger.error({ err, ownerId }, 'Map listing failed');
      throw err;
    }
  }

  async findOneForOwner(ownerId: string, mapId: string) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .select()
        .from(maps)
        .where(and(eq(maps.id, mapId), eq(maps.ownerId, ownerId)))
        .limit(1);
      this.logger.debug(
        { durationMs: Date.now() - t0, ownerId, mapId, found: Boolean(row) },
        'Map lookup',
      );
      if (!row) throw new NotFoundException(MAP_NOT_FOUND);
      return toMapInfo(row);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error({ err, ownerId, mapId }, 'Map lookup failed');
      throw err;
    }
  }

  async rename(ownerId: string, mapId: string, name: string) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .update(maps)
        .set({ name })
        .where(and(eq(maps.id, mapId), eq(maps.ownerId, ownerId)))
        .returning();
      if (!row) throw new NotFoundException(MAP_NOT_FOUND);
      this.logger.info(
        { durationMs: Date.now() - t0, ownerId, mapId },
        'Map renamed',
      );
      return toMapInfo(row);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error({ err, ownerId, mapId }, 'Map rename failed');
      throw err;
    }
  }

  // Чанки и журнал удаляются каскадом.
  async remove(ownerId: string, mapId: string) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .delete(maps)
        .where(and(eq(maps.id, mapId), eq(maps.ownerId, ownerId)))
        .returning({ id: maps.id });
      if (!row) throw new NotFoundException(MAP_NOT_FOUND);
      this.logger.info(
        { durationMs: Date.now() - t0, ownerId, mapId },
        'Map deleted',
      );
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error({ err, ownerId, mapId }, 'Map deletion failed');
      throw err;
    }
  }
}
