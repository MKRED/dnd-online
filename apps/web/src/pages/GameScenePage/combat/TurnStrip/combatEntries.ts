import type {
  CombatantRef,
  CreatureHealth,
  GameCombat,
  GameCombatant,
  GameCreature,
  GameFigure,
  MapObject,
  Vec3,
} from 'shared';
import { figureImagePath } from '../../../../features/games';
import type { ParticipantKind } from '../../participants/ParticipantRow';

// Участник боя для полосы очерёдности (docs/plan/combat.md, этап 3): кто он на сцене, его
// портрет и что о его здоровье видит смотрящий.
export interface CombatEntry {
  combatant: GameCombatant;
  id: string;
  name: string;
  kind: ParticipantKind;
  image: string | null;
  at: Vec3 | null;
  health: CreatureHealth | null;
  // Хиты — тем, кому их видно: партии все герои, мастеру и существа.
  hitPoints: { current: number; max: number } | null;
  // Скрыт мастером от игроков (видно только мастеру).
  hidden: boolean;
}

export interface EntrySources {
  gameId: string;
  figures: readonly GameFigure[];
  creatures: readonly GameCreature[];
  objectOf: (objectId: number) => MapObject | undefined;
  portraitOf: (object: MapObject | undefined) => string | null;
}

// Как участник выглядит на сцене: портрет, место и здоровье — по фигурке или объекту.
export type CombatLook = Omit<CombatEntry, 'combatant' | 'id' | 'name'>;

export function combatLook(
  ref: CombatantRef,
  sources: EntrySources,
): CombatLook {
  if (ref.kind === 'figure') {
    const { characterId } = ref;
    const figure = sources.figures.find((f) => f.character.id === characterId);
    return {
      kind: 'pc',
      image: figure ? figureImagePath(sources.gameId, figure) : null,
      at: figure?.at ?? null,
      health: figure?.health ?? null,
      hitPoints: figure?.hitPoints ?? null,
      hidden: false,
    };
  }
  const { objectId } = ref;
  const object = sources.objectOf(objectId);
  const creature = sources.creatures.find((c) => c.objectId === objectId);
  return {
    kind: object?.kind === 'npc' ? 'npc' : 'monster',
    image: sources.portraitOf(object),
    at: object?.at ?? null,
    health: creature?.health ?? null,
    hitPoints: creature?.state?.hitPoints ?? null,
    hidden: object?.hidden ?? false,
  };
}

export const combatEntry = (
  combatant: GameCombatant,
  sources: EntrySources,
): CombatEntry => ({
  combatant,
  id: combatant.id,
  name: combatant.name,
  ...combatLook(combatant.ref, sources),
});

export function combatEntries(
  combat: GameCombat,
  sources: EntrySources,
): CombatEntry[] {
  return combat.combatants.map((c) => combatEntry(c, sources));
}
