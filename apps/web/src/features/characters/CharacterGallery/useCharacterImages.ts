import { useCallback, useEffect, useState } from 'react';
import {
  CHARACTER_IMAGE_MAX_COUNT,
  type CharacterImage,
  type ThumbCrop,
} from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import {
  deleteCharacterImage,
  listCharacterImages,
  updateCharacterImage,
  uploadCharacterImage,
} from '../characterImagesApi';

// Файл, который не удалось добавить, и причина — показываем списком под сеткой.
export interface UploadProblem {
  fileName: string;
  message: string;
}

// Данные галереи и её правки. Каждая правка сохраняется сразу, без кнопки «Сохранить».
export function useCharacterImages(characterId: string) {
  const [images, setImages] = useState<CharacterImage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [problems, setProblems] = useState<UploadProblem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listCharacterImages(characterId)
      .then(setImages)
      .catch((err: unknown) => {
        console.error('Failed to load character images', err);
        setLoadError(errorMessage(err, 'Не удалось загрузить картинки'));
      });
  }, [characterId]);

  const addProblems = useCallback((added: UploadProblem[]) => {
    setProblems((prev) => [...prev, ...added]);
  }, []);

  // Файлы уходят по одному: сервер перекодирует картинку, и пачка параллельных
  // загрузок только упёрлась бы в его лимит запросов. Ошибка одного не мешает остальным.
  const upload = async (files: File[]) => {
    const free = CHARACTER_IMAGE_MAX_COUNT - (images?.length ?? 0);
    const accepted = files.slice(0, Math.max(free, 0));
    addProblems(
      files.slice(accepted.length).map((file) => ({
        fileName: file.name,
        message: `в галерее может быть не больше ${CHARACTER_IMAGE_MAX_COUNT} картинок`,
      })),
    );
    setUploadingCount(accepted.length);
    for (const file of accepted) {
      try {
        const image = await uploadCharacterImage(characterId, file);
        setImages((prev) => [...(prev ?? []), image]);
      } catch (err: unknown) {
        console.error('Character image upload failed', file.name, err);
        addProblems([
          {
            fileName: file.name,
            message: errorMessage(err, 'не удалось загрузить'),
          },
        ]);
      }
      setUploadingCount((count) => count - 1);
    }
  };

  // Смена основной и удаление меняют и соседние картинки (флаг основной переходит),
  // поэтому после правки перечитываем галерею целиком, а не правим список на месте.
  const change = async (
    imageId: string,
    fallback: string,
    work: () => Promise<unknown>,
  ): Promise<boolean> => {
    setActionError(null);
    setBusyId(imageId);
    try {
      await work();
      setImages(await listCharacterImages(characterId));
      return true;
    } catch (err: unknown) {
      console.error('Character image change failed', imageId, err);
      setActionError(errorMessage(err, fallback));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return {
    images,
    loadError,
    uploadingCount,
    problems,
    actionError,
    busyId,
    upload,
    addProblems,
    clearProblems: () => setProblems([]),
    clearActionError: () => setActionError(null),
    setMain: (imageId: string) =>
      change(imageId, 'Не удалось сменить основную картинку', () =>
        updateCharacterImage(characterId, imageId, { isMain: true }),
      ),
    saveThumbCrop: (imageId: string, thumbCrop: ThumbCrop) =>
      change(imageId, 'Не удалось сохранить миниатюру', () =>
        updateCharacterImage(characterId, imageId, { thumbCrop }),
      ),
    remove: (imageId: string) =>
      change(imageId, 'Не удалось удалить картинку', () =>
        deleteCharacterImage(characterId, imageId),
      ),
  };
}
