import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CatalogImage, CharacterImage } from 'shared';
import { z } from 'zod';
import { DndApiError, type ApiCall } from './apiClient.js';
import { entityPath, ENTITY_KINDS, isCatalogKind } from './entityKinds.js';
import { readImageFile, thumbCropFor, type ThumbArea } from './imageFile.js';
import { json, type Guarded } from './toolResult.js';

const share = z.number().min(0).max(1);
const thumb = z
  .object({ centerX: share, centerY: share, size: share.positive() })
  .describe(
    'Миниатюра — квадрат: центр долями ширины и высоты картинки (0..1, 0 — левый и верхний край) и сторона долей короткой стороны. Портрет: центр на лице.',
  );

// Загрузка картинки с диска (docs/plan/ai-access.md, этап 4).
export function registerImageTools(
  server: McpServer,
  api: ApiCall,
  guarded: Guarded,
) {
  server.registerTool(
    'upload_image',
    {
      description:
        'Загрузить картинку с диска (PNG, JPEG или WebP, до 10 МБ; path — абсолютный путь, например из comfy.generate). У монстра, предмета, способности и эффекта картинка одна: новая заменяет старую, миниатюра по умолчанию — картинка целиком. У персонажа и НПС картинка добавляется в галерею (до 20); первая становится главной сама, main: true делает главной и эту; миниатюра по умолчанию — квадрат по центру. thumb задаёт миниатюру самому. Удалить картинку токеном нельзя — это делает пользователь.',
      inputSchema: {
        kind: z.enum(ENTITY_KINDS),
        id: z.uuid(),
        path: z.string().min(1),
        main: z.boolean().optional(),
        thumb: thumb.optional(),
      },
    },
    ({ kind, id, path, main, thumb: area }) =>
      guarded(async () => {
        const form = new FormData();
        form.append('file', await readImageFile(path), 'image');
        if (isCatalogKind(kind)) {
          if (main !== undefined) {
            throw new DndApiError(
              'main есть только у галереи персонажа и НПС: у записи каталога картинка одна.',
            );
          }
          const url = `${entityPath(kind, id)}/image`;
          const image = await api<CatalogImage>(url, { method: 'PUT', form });
          return json(
            area ? await recropCatalog(api, url, image, area) : image,
          );
        }
        const url = `${entityPath(kind, id)}/images`;
        const image = await api<CharacterImage>(url, { method: 'POST', form });
        const patch = {
          ...(main && !image.isMain ? { isMain: true } : {}),
          ...(area
            ? { thumbCrop: thumbCropFor(area, image.width, image.height) }
            : {}),
        };
        if (Object.keys(patch).length === 0) return json(image);
        return json(
          await api<CharacterImage>(`${url}/${image.id}`, {
            method: 'PATCH',
            body: patch,
          }),
        );
      }),
  );
}

function recropCatalog(
  api: ApiCall,
  url: string,
  image: CatalogImage,
  area: ThumbArea,
) {
  return api<CatalogImage>(url, {
    method: 'PATCH',
    body: { thumbCrop: thumbCropFor(area, image.width, image.height) },
  });
}
