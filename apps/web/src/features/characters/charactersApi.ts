import type {
  AbilityScore,
  Character,
  CharacterClassLevel,
  CharacterCurrency,
  CharacterPersonality,
  CharacterProficiencies,
  SkillProficiency,
} from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Полезная нагрузка создания чарника: подмножество Character без серверных полей
// (id/userId/createdAt) — форма присылает только то, что валидирует CreateCharacterDto.
export interface CreateCharacterPayload {
  name: string;
  species: string;
  background: string;
  alignment?: string;
  experiencePoints?: number;
  classes: CharacterClassLevel[];
  proficiencyBonus: number;
  abilityScores: Record<AbilityScore, number>;
  savingThrowProficiencies: AbilityScore[];
  skillProficiencies: SkillProficiency[];
  armorClass: number;
  speed: number;
  hitPointsMax: number;
  hitPointsCurrent: number;
  heroicInspiration?: boolean;
  proficiencies: CharacterProficiencies;
  weaponMasteries?: string[];
  currency: CharacterCurrency;
  personality: CharacterPersonality;
}

export function createCharacter(
  payload: CreateCharacterPayload,
): Promise<Character> {
  return request('/characters', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listCharacters(): Promise<Character[]> {
  return request('/characters');
}

export function getCharacter(id: string): Promise<Character> {
  return request(`/characters/${id}`);
}

// Полное редактирование чарника формой — тот же payload, что и при создании.
export function updateCharacter(
  id: string,
  payload: CreateCharacterPayload,
): Promise<Character> {
  return request(`/characters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteCharacter(id: string): Promise<void> {
  return request(`/characters/${id}`, { method: 'DELETE' });
}
