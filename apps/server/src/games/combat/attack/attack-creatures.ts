import {
  creatureBody,
  damageDefenses,
  fighterConditions,
  fighterEffectsOf,
  monsterTotals,
  sheetTotals,
  type Character,
  type CharacterEffectEntry,
  type Monster,
} from 'shared';
import type { DbTransaction } from '../../../database/database.service.js';
import {
  loadCreatureEffects,
  loadCreatureHitPoints,
  loadSceneCreatures,
} from '../../creatures/creature-read.js';
import type { SceneWorld } from '../../figures/scene-world.js';
import {
  findLibraryRow,
  readLibraryEntry,
} from '../../library/library-read.js';
import type { SceneRow } from '../../scenes/scene-copy.js';
import type { Fighter } from './attack-fighters.js';
import { cellsOf } from './attack-geometry.js';

// Монстры и НПС сцены для правил атаки: КД, эффекты и защиты — как у карточки экземпляра
// на сцене (CardBodies.tsx): эффекты копии и черты плюс эффекты экземпляра.

type Record_ =
  { kind: 'monster'; record: Monster } | { kind: 'npc'; record: Character };

// Копия в библиотеке — одна на источник, сколько бы экземпляров ни стояло на сцене.
async function readRecords(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  refs: { kind: 'monster' | 'npc'; sourceId: string }[],
): Promise<Map<string, Record_>> {
  const result = new Map<string, Record_>();
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.sourceId}`;
    if (result.has(key)) continue;
    const row = await findLibraryRow(tx, gameId, ref);
    if (!row) continue;
    const { record } = await readLibraryEntry(tx, row, masterId);
    result.set(
      key,
      ref.kind === 'monster'
        ? { kind: 'monster', record: record as Monster }
        : { kind: 'npc', record: record as Character },
    );
  }
  return result;
}

function totalsOf(
  found: Record_ | undefined,
  instance: CharacterEffectEntry[],
) {
  if (!found) {
    // Копии нет — «Неизвестное существо» (creature-read.ts): КД 10 без эффектов копии.
    const effects = fighterEffectsOf(instance, []);
    return {
      armorClass: 10,
      effects,
      defenses: damageDefenses(effects.effects),
    };
  }
  if (found.kind === 'monster') {
    const { statBlock } = found.record;
    const abilities = found.record.abilities ?? [];
    const entries = [...(found.record.effects ?? []), ...instance];
    const effects = fighterEffectsOf(entries, abilities);
    return {
      armorClass: monsterTotals(statBlock, entries, abilities).armorClass,
      effects,
      defenses: damageDefenses(effects.effects, statBlock),
    };
  }
  const sheet = {
    ...found.record,
    effects: [...found.record.effects, ...instance],
  };
  const effects = fighterEffectsOf(sheet.effects, sheet.abilities);
  return {
    armorClass: sheetTotals(sheet).armorClass,
    effects,
    defenses: damageDefenses(effects.effects),
  };
}

export async function creatureFighters(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  scene: SceneRow,
  world: SceneWorld,
): Promise<Fighter[]> {
  const creatures = await loadSceneCreatures(tx, gameId, scene.id);
  if (creatures.length === 0) return [];
  const hitPoints = await loadCreatureHitPoints(tx, scene.id, creatures);
  const instanceEffects = await loadCreatureEffects(tx, gameId, scene.id);
  const records = await readRecords(tx, gameId, masterId, creatures);
  return creatures.flatMap((creature): Fighter[] => {
    const placed = world.creatures.find(
      (c) => c.objectId === creature.objectId,
    );
    if (!placed) return [];
    const hp = hitPoints.get(creature.objectId)!;
    const totals = totalsOf(
      records.get(`${creature.kind}:${creature.sourceId}`),
      instanceEffects.get(creature.objectId) ?? [],
    );
    return [
      {
        ref: { kind: 'creature', objectId: creature.objectId },
        name: creature.name,
        body: creatureBody(world.map, creature.at, placed.size),
        cells: cellsOf(creature.at, placed.size),
        hidden: creature.hidden,
        party: false,
        down: hp.current === 0,
        ...totals,
        conditions: fighterConditions(totals.effects.effects),
        hitPoints: hp,
        character: null,
        seated: null,
        creature,
      },
    ];
  });
}
