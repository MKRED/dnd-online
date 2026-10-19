import type {
  CharacterAbilityAddInput,
  CharacterAbilityEntry,
  CharacterAbilityUpdateInput,
} from 'shared';
import { abilityLinksApi } from '../../abilityLinks';

// Способности персонажа (docs/server.md, «Abilities on a character»).
export const characterAbilitiesApi = (characterId: string) =>
  abilityLinksApi<
    CharacterAbilityEntry,
    CharacterAbilityAddInput,
    CharacterAbilityUpdateInput
  >(`/characters/${characterId}/abilities`);
