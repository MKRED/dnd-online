import type {
  AbilityScore,
  Character,
  CharacterClassLevel,
  CharacterCurrency,
  CharacterPersonality,
  CharacterProficiencies,
  SkillProficiency,
} from 'shared';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api';

export class CharactersApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ErrorBody {
  message?: string | string[];
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const data = (await res.json().catch(() => null)) as ErrorBody | null;
  const message = Array.isArray(data?.message)
    ? data.message.join(', ')
    : (data?.message ?? 'Request failed');
  throw new CharactersApiError(res.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  await throwIfNotOk(res);
  // DELETE отвечает 204 No Content — тела нет, res.json() на пустом теле бросит
  // "Unexpected end of JSON input".
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

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

export function deleteCharacter(id: string): Promise<void> {
  return request(`/characters/${id}`, { method: 'DELETE' });
}
