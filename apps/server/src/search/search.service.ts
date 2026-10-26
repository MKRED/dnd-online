import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  SEARCH_KINDS,
  SEARCH_LIMIT_DEFAULT,
  type SearchGroup,
  type SearchKind,
  type SearchResult,
} from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { DatabaseService } from '../database/database.service.js';
import {
  searchAbilities,
  searchEffects,
  searchItems,
  searchMonsters,
} from './catalog-search.js';
import { searchCharacters, searchMaps } from './own-search.js';
import type { Found, SearchParams } from './search-params.js';

type Searcher = (db: Db, params: SearchParams) => Promise<Found<object>>;

const SEARCHERS: Record<SearchKind, Searcher> = {
  ability: searchAbilities,
  monster: searchMonsters,
  character: searchCharacters,
  item: searchItems,
  effect: searchEffects,
  map: searchMaps,
};

// Строки выборки → группа: total одинаков во всех строках, в записи он не нужен.
function toGroup(kind: SearchKind, rows: Found<object>): SearchGroup {
  const hits = rows.map((row) => {
    const hit: Partial<typeof row> = { ...row };
    delete hit.total;
    return hit;
  });
  return { kind, total: rows[0]?.total ?? 0, hits } as SearchGroup;
}

// Общий поиск из шапки: по названию во всех разделах сразу, по запросу на раздел
// параллельно. Только чтение.
@Injectable()
export class SearchService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(SearchService.name)
    private readonly logger: PinoLogger,
  ) {}

  async search(
    userId: string,
    q: string,
    kind: SearchKind | undefined,
    limit = SEARCH_LIMIT_DEFAULT,
  ): Promise<SearchResult> {
    const t0 = Date.now();
    const kinds: readonly SearchKind[] = kind ? [kind] : SEARCH_KINDS;
    const params = { userId, q, limit };
    try {
      const groups = await Promise.all(
        kinds.map(async (k) =>
          toGroup(k, await SEARCHERS[k](this.databaseService.db, params)),
        ),
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          kinds: kinds.length,
          found: groups.reduce((sum, group) => sum + group.total, 0),
        },
        'Searched',
      );
      return { groups };
    } catch (err) {
      this.logger.error({ err, kind }, 'Search failed');
      throw err;
    }
  }
}
