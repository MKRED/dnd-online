import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type {
  CatalogImageVariant,
  GameSceneFogView,
  GameSceneView,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import {
  MASTER_ONLY_FOG,
  NO_ACTIVE_SCENE,
  SCENE_CLOSED,
  SCENE_MEMBERS_ONLY,
  SCENE_NO_IMAGE,
} from '../game-errors.js';
import { findGameAccess } from '../game-read.js';
import { readLibraryImage } from '../library/index.js';
import { fogView, playerFog } from '../fog/fog-view.js';
import { sceneShowsEntry, type SceneImageKind } from './scene-image-access.js';
import { findActiveScene, readSceneView, sceneStatus } from './scene-read.js';

// Страница сцены (docs/plan/done/game.md, этап 5): активная сцена мастеру и участникам игры,
// игрокам — только открытая. Картинки объектов — копии из библиотеки.
@Injectable()
export class GameSceneViewService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GameSceneViewService.name)
    private readonly logger: PinoLogger,
  ) {}

  async view(userId: string, gameId: string): Promise<GameSceneView> {
    const t0 = Date.now();
    try {
      const master = await this.assertParticipant(userId, gameId);
      // Строка игры, сцена, чанки и объекты — одним снимком: перезапуск, закончившийся
      // между запросами, не смешает старую сцену с новой.
      const view = await this.databaseService.db.transaction(
        async (tx) => {
          const [{ sceneOpen }] = await tx
            .select({ sceneOpen: games.sceneOpen })
            .from(games)
            .where(eq(games.id, gameId));
          const scene = await findActiveScene(tx, gameId);
          if (!scene) throw new NotFoundException(NO_ACTIVE_SCENE);
          const status = sceneStatus(scene, sceneOpen, master);
          if (!status) throw new ForbiddenException(SCENE_CLOSED);
          return readSceneView(tx, scene, status, master);
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          sceneId: view.scene.id,
          chunks: view.chunks.length,
          objects: view.objects.length,
        },
        'Game scene read',
      );
      return view;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Game scene read failed');
      throw err;
    }
  }

  // Туман войны активной сцены для «Глазами игроков» (docs/plan/done/fog-of-war.md, этап 6):
  // мастер видит сцену целиком, а маски — то, что сейчас видят игроки. Только мастеру:
  // игрок получает свои маски вместе со сценой. fog: null — туман выключен (обёртка —
  // чтобы ответ был JSON, а не пустым телом).
  async fog(
    userId: string,
    gameId: string,
  ): Promise<{ fog: GameSceneFogView | null }> {
    const t0 = Date.now();
    try {
      const master = await this.assertParticipant(userId, gameId);
      if (!master) throw new ForbiddenException(MASTER_ONLY_FOG);
      const { db } = this.databaseService;
      const scene = await findActiveScene(db, gameId);
      if (!scene) throw new NotFoundException(NO_ACTIVE_SCENE);
      const fog = await playerFog(db, scene);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          sceneId: scene.id,
          chunks: fog?.explored.size ?? 0,
        },
        'Scene fog read',
      );
      return { fog: fog && fogView(fog) };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Scene fog read failed');
      throw err;
    }
  }

  // Мастеру — любая копия этих видов; игроку — только того, что стоит на открытой
  // активной сцене и не скрыто.
  async imageFile(
    userId: string,
    gameId: string,
    kind: SceneImageKind,
    sourceId: string,
    variant: CatalogImageVariant,
  ): Promise<Buffer> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const master = await this.assertParticipant(userId, gameId);
      if (!master) {
        const [{ sceneOpen }] = await db
          .select({ sceneOpen: games.sceneOpen })
          .from(games)
          .where(eq(games.id, gameId));
        const scene = await findActiveScene(db, gameId);
        const shown =
          sceneOpen &&
          scene !== undefined &&
          (await sceneShowsEntry(
            db,
            scene.id,
            kind,
            sourceId,
            await playerFog(db, scene),
          ));
        if (!shown) throw new NotFoundException(SCENE_NO_IMAGE);
      }
      const data = await readLibraryImage(
        db,
        gameId,
        { kind, sourceId },
        variant,
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          kind,
          sourceId,
          variant,
          found: !!data,
        },
        'Game scene image lookup',
      );
      if (!data) throw new NotFoundException(SCENE_NO_IMAGE);
      return data;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, kind, sourceId, variant },
        'Game scene image lookup failed',
      );
      throw err;
    }
  }

  // Мастер или участник игры (вошёл в лобби); зритель без входа — открытый вопрос плана,
  // пока сцену не видит. true — мастер.
  private async assertParticipant(
    userId: string,
    gameId: string,
  ): Promise<boolean> {
    const { game, member } = await findGameAccess(
      this.databaseService.db,
      gameId,
      userId,
    );
    const master = game.masterId === userId;
    if (!master && !member) throw new ForbiddenException(SCENE_MEMBERS_ONLY);
    return master;
  }
}
