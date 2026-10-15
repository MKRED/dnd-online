import { HttpException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogImageVariant } from 'shared';
import type { DatabaseService } from '../../database/database.service.js';
import { visibleEntry } from '../catalog-access.js';
import type { CatalogImageConfig } from './catalog-image.config.js';

// Отдача байтов картинки записи каталога: её видит каждый, кто видит саму запись.
export abstract class CatalogImageFilesService {
  protected constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: PinoLogger,
    private readonly config: CatalogImageConfig,
  ) {}

  async getFile(
    userId: string,
    ownerId: string,
    variant: CatalogImageVariant,
  ): Promise<Buffer> {
    const { access, tables, catalog, noImage } = this.config;
    const t0 = Date.now();
    const meta = { catalog, userId, ownerId, variant };
    try {
      const [row] = await this.databaseService.db
        .select({ data: tables.files.data })
        .from(tables.files)
        .innerJoin(access.table, eq(access.id, tables.files.ownerId))
        .where(
          and(
            visibleEntry(access, userId, ownerId),
            eq(tables.files.variant, variant),
          ),
        )
        .limit(1);
      this.logger.debug(
        { durationMs: Date.now() - t0, ...meta, found: !!row },
        'Catalog image file lookup',
      );
      // Невидимая запись и запись без картинки неразличимы — обе 404.
      if (!row) throw new NotFoundException(noImage);
      return row.data;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, ...meta },
        'Catalog image file lookup failed',
      );
      throw err;
    }
  }
}
