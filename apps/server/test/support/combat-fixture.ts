import type request from 'supertest';
import type { GameCombat, GameScenes } from 'shared';
import { characterBody } from './character-fixture.js';
import { createWeapon } from './equipment-fixture.js';
import { createSceneGame, fogOff, startSession } from './scene-fixture.js';

// Бой для e2e атак (docs/plan/combat.md, этап 5) на сцене фикстуры (scene-fixture.ts): герой
// игрока на старте [0,1,0], гоблин в 5 фт. [1,1,0], НПС-трактирщик в 10 фт. [2,1,0].
// Очередь: герой (20), гоблин (10), трактирщик (5); ход у героя.

export interface Weapons {
  // Имя оружия → id строки инвентаря героя.
  [name: string]: string;
}

type User = { agent: request.Agent; id: string };

export async function attackScene(
  user: (login: string) => Promise<User>,
  png: Buffer,
  prefix: string,
  options: {
    // Оружие героя: имя, поля оружия и место куклы (null — в инвентаре).
    weapons?: {
      name: string;
      over: Record<string, unknown>;
      slot: string | null;
    }[];
    goblin?: object;
  } = {},
) {
  const g = await createSceneGame(user, png, prefix);
  const m = g.master.agent;
  const p = g.player.agent;
  await p
    .put(`/api/characters/${g.character}`)
    .send(
      characterBody({
        name: 'Зритель',
        proficiencies: {
          armor: [],
          weapons: ['simple', 'martial'],
          tools: [],
          languages: [],
        },
      }),
    )
    .expect(200);
  const rows: Weapons = {};
  for (const w of options.weapons ?? []) {
    const item = await createWeapon(p, w.name, w.over);
    const res = await p
      .post(`/api/characters/${g.character}/items`)
      .send({ itemId: item.id, quantity: 1, location: 'carried' })
      .expect(201);
    rows[w.name] = (res.body as { id: string }[]).at(-1)!.id;
    if (w.slot) {
      await p
        .put(`/api/characters/${g.character}/equipment/${w.slot}`)
        .send({ entryId: rows[w.name] })
        .expect(200);
    }
  }
  if (options.goblin) {
    const monster = await m.get(`/api/monsters/${g.goblin}`).expect(200);
    const body = monster.body as Record<string, unknown>;
    await m
      .put(`/api/monsters/${g.goblin}`)
      .send({
        name: body.name,
        category: body.category,
        role: body.role,
        description: body.description,
        sources: body.sources,
        isPublic: body.isPublic,
        statBlock: { ...(body.statBlock as object), ...options.goblin },
      })
      .expect(200);
  }
  const res = await m
    .post(`/api/games/${g.gameId}/scenes`)
    .send({ mapId: g.mapId })
    .expect(201);
  const sceneId = (res.body as GameScenes).scenes[0].id;
  await fogOff(m, g.gameId, sceneId);
  await m
    .put(`/api/games/${g.gameId}/scenes/open`)
    .send({ open: true })
    .expect(200);
  await startSession(m, g.gameId);
  const url = `/api/games/${g.gameId}/combat`;
  const started = (
    await m
      .post(`${url}/start`)
      .send({
        participants: [
          { kind: 'figure', characterId: g.character },
          { kind: 'creature', objectId: 2 },
          { kind: 'creature', objectId: 3 },
        ],
      })
      .expect(200)
  ).body as GameCombat;
  const [hero, goblin, npc] = started.combatants.map((c) => c.id);
  for (const [id, initiative] of [
    [hero, 20],
    [goblin, 10],
    [npc, 5],
  ] as const) {
    await m
      .put(`${url}/combatants/${id}/initiative`)
      .send({ initiative })
      .expect(200);
  }
  const at = (id: string) => `${url}/combatants/${id}`;
  // Правка карты сцены мастером: стены для укрытия.
  const ops = (list: unknown[]) =>
    m
      .post(`/api/games/${g.gameId}/scenes/${sceneId}/ops`)
      .send({ ops: list })
      .expect(200);
  return { ...g, m, p, url, at, ops, hero, goblin, npc, rows };
}

export const goblinRef = { kind: 'creature', objectId: 2 } as const;
export const npcRef = { kind: 'creature', objectId: 3 } as const;
export const message = (res: request.Response) =>
  (res.body as { message: string }).message;
