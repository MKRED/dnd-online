import type { CharacterMainImage } from 'shared';
import { characterImagePath } from '../../../characters/characterImagesApi';
import { characterModelPath } from '../../../characters/CharacterModel/characterModelApi';
import { itemImagePath } from '../../../items';
import { monstersApi } from '../../../monsters/monstersApi';

// Откуда брать миниатюры объектов. Редактор карты берёт их из справочников и галереи
// персонажа; сцена игры — из копий в библиотеке игры (docs/plan/done/game.md, этап 5).
export interface ObjectImagePaths {
  monster: (monsterId: string, version: number) => string;
  item: (itemId: string, version: number) => string;
  npc: (characterId: string, image: CharacterMainImage) => string;
  // Байты 3D-модели НПС (docs/plan/character-models.md, этап 4).
  npcModel: (characterId: string, version: number) => string;
}

export const CATALOG_OBJECT_IMAGES: ObjectImagePaths = {
  monster: (id, version) => monstersApi.imagePath(id, 'thumb', version),
  item: (id, version) => itemImagePath(id, 'thumb', version),
  npc: (characterId, image) =>
    characterImagePath(characterId, image.id, 'thumb', image.thumbVersion),
  npcModel: characterModelPath,
};
