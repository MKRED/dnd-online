import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  chunkKeysInBox,
  encodeChunk,
  MAX_SLICE_CELLS,
  parseChunkKey,
  renderAsciiSlice,
  summarizeMap,
  type MapChunksResponse,
  type MapSliceResponse,
  type MapSummaryResponse,
  type SliceRegion,
} from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import type { maps } from '../database/schema/index.js';
import { SliceQueryDto } from './dto/slice-query.dto.js';
import { findOwnedMap } from './map-access.js';
import { loadChunks } from './map-storage.js';

type MapRow = typeof maps.$inferSelect;

// Чтение блоков карты: для рендера (чанки), для нейросети (срез, сводка).
@Injectable()
export class MapReadService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MapReadService.name) private readonly logger: PinoLogger,
  ) {}

  getChunks(ownerId: string, mapId: string): Promise<MapChunksResponse> {
    return this.read(ownerId, mapId, 'chunks', async (tx, map) => {
      const store = await loadChunks(tx, mapId, 'all');
      const chunks = [...store.keys()].map((key) => {
        const [cx, cy, cz] = parseChunkKey(key);
        const bytes = encodeChunk(store.get(key)!);
        return { cx, cy, cz, data: Buffer.from(bytes).toString('base64') };
      });
      return { seq: map.seq, palette: map.palette, chunks };
    });
  }

  getSummary(ownerId: string, mapId: string): Promise<MapSummaryResponse> {
    return this.read(ownerId, mapId, 'summary', async (tx, map) => {
      const store = await loadChunks(tx, mapId, 'all');
      const summary = summarizeMap({ store, palette: map.palette });
      return {
        seq: map.seq,
        ...summary,
        chunkCount: [...store.keys()].length,
        palette: map.palette,
      };
    });
  }

  getSlice(
    ownerId: string,
    mapId: string,
    query: SliceQueryDto,
  ): Promise<MapSliceResponse> {
    return this.read(ownerId, mapId, 'slice', async (tx, map) => {
      const { y } = query;
      let region = sliceRegionFromQuery(query);
      if (!region) {
        // Прямоугольник не задан — берём горизонтальные границы всей карты.
        const all = await loadChunks(tx, mapId, 'all');
        const bounds = summarizeMap({
          store: all,
          palette: map.palette,
        }).bounds;
        if (!bounds) return { seq: map.seq, y, text: 'Карта пустая' };
        region = {
          minX: bounds.min[0],
          maxX: bounds.max[0],
          minZ: bounds.min[2],
          maxZ: bounds.max[2],
        };
      }
      assertSliceSize(region);
      const store = await loadChunks(
        tx,
        mapId,
        chunkKeysInBox({
          min: [region.minX, y, region.minZ],
          max: [region.maxX, y, region.maxZ],
        }),
      );
      const text = renderAsciiSlice({ store, palette: map.palette }, y, region);
      return { seq: map.seq, y, text };
    });
  }

  // Строка карты и чанки читаются одним снимком (REPEATABLE READ): иначе правка,
  // закоммиченная между запросами, дала бы чанки с id, которых нет в прочитанной палитре.
  private async read<T>(
    ownerId: string,
    mapId: string,
    what: string,
    run: (tx: DbTransaction, map: MapRow) => Promise<T>,
  ): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await this.databaseService.db.transaction(
        async (tx) => {
          const map = await findOwnedMap(tx, ownerId, mapId, {
            forUpdate: false,
          });
          return run(tx, map);
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, mapId, what },
        'Map read',
      );
      return result;
    } catch (err: unknown) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error({ err, ownerId, mapId, what }, 'Map read failed');
      throw err;
    }
  }
}

function sliceRegionFromQuery(query: SliceQueryDto): SliceRegion | null {
  const { minX, maxX, minZ, maxZ } = query;
  const given = [minX, maxX, minZ, maxZ].filter((v) => v !== undefined);
  if (given.length === 0) return null;
  if (given.length !== 4) {
    throw new BadRequestException(
      'Прямоугольник среза задаётся целиком: minX, maxX, minZ, maxZ',
    );
  }
  return { minX: minX!, maxX: maxX!, minZ: minZ!, maxZ: maxZ! };
}

// Проверяем до загрузки чанков: огромный прямоугольник не должен тянуть пол-карты из БД.
function assertSliceSize({ minX, maxX, minZ, maxZ }: SliceRegion) {
  const width = maxX - minX + 1;
  const depth = maxZ - minZ + 1;
  if (width < 1 || depth < 1 || width * depth > MAX_SLICE_CELLS) {
    throw new BadRequestException(
      `Срез ${width}×${depth} — нужна область от 1 до ${MAX_SLICE_CELLS} клеток. Уточните minX, maxX, minZ, maxZ.`,
    );
  }
}
