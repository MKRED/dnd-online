import type {
  MonsterAbilityAddInput,
  MonsterAbilityEntry,
  MonsterAbilityUpdateInput,
} from 'shared';
import { abilityLinksApi } from '../../abilityLinks';

// Способности монстра (docs/server.md, «Abilities on a monster»).
export const monsterAbilitiesApi = (monsterId: string) =>
  abilityLinksApi<
    MonsterAbilityEntry,
    MonsterAbilityAddInput,
    MonsterAbilityUpdateInput
  >(`/monsters/${monsterId}/abilities`);
