import type {
  CharacterModel,
  CharacterModelPatch,
  CharacterModelView,
} from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

// 3D-модель персонажа (docs/plan/done/character-models.md, этап 1).
const base = (characterId: string) => `/characters/${characterId}/model`;

export const getCharacterModel = (characterId: string) =>
  apiRequest<CharacterModelView>(base(characterId)).then(({ model }) => model);

export function uploadCharacterModel(
  characterId: string,
  file: File,
): Promise<CharacterModel> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest(base(characterId), { method: 'PUT', body });
}

export const patchCharacterModel = (
  characterId: string,
  patch: CharacterModelPatch,
) =>
  apiRequest<CharacterModel>(base(characterId), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteCharacterModel = (characterId: string) =>
  apiRequest<void>(base(characterId), { method: 'DELETE' });

// Адрес байтов с версией: ответ кешируется навсегда, новая загрузка — новый адрес.
export const characterModelPath = (characterId: string, version: number) =>
  `${base(characterId)}/file?v=${version}`;
