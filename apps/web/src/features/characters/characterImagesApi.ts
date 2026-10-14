import type { CharacterImage, CharacterImageVariant, ThumbCrop } from 'shared';
import { apiRequest, apiRequestBlob } from '../../lib/apiRequest';

const base = (characterId: string) => `/characters/${characterId}/images`;

export function listCharacterImages(
  characterId: string,
): Promise<CharacterImage[]> {
  return apiRequest(base(characterId));
}

export function uploadCharacterImage(
  characterId: string,
  file: File,
): Promise<CharacterImage> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest(base(characterId), { method: 'POST', body });
}

export function updateCharacterImage(
  characterId: string,
  imageId: string,
  changes: { isMain?: true; thumbCrop?: ThumbCrop },
): Promise<CharacterImage> {
  return apiRequest(`${base(characterId)}/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function deleteCharacterImage(
  characterId: string,
  imageId: string,
): Promise<void> {
  return apiRequest(`${base(characterId)}/${imageId}`, { method: 'DELETE' });
}

// version нужна только миниатюре: её содержимое меняется при новом вырезе, а сервер
// разрешает кешировать ответ навсегда.
export function fetchCharacterImageFile(
  characterId: string,
  imageId: string,
  variant: CharacterImageVariant,
  version?: number,
): Promise<Blob> {
  const query = new URLSearchParams({ variant });
  if (version !== undefined) query.set('v', String(version));
  return apiRequestBlob(`${base(characterId)}/${imageId}/file?${query}`);
}
