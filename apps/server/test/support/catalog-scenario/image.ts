import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import type { CatalogContext } from './catalog-scenario.types.js';

export function describeImage(get: () => CatalogContext): void {
  describe('картинка', () => {
    it('загрузка, миниатюра для другого, вырез и удаление', async () => {
      const { author, stranger, url, create } = get();
      const { id } = await create({ isPublic: true });
      const png = await sharp({
        create: {
          width: 400,
          height: 100,
          channels: 4,
          background: { r: 200, g: 50, b: 50, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const file = { filename: 'x.png', contentType: 'image/png' };

      const up = await author
        .put(`${url(id)}/image`)
        .attach('file', png, file)
        .expect(200);
      expect(up.body).toMatchObject({ version: 1, width: 400, height: 100 });
      await stranger
        .put(`${url(id)}/image`)
        .attach('file', png, file)
        .expect(403);

      const thumb = await stranger
        .get(`${url(id)}/image?variant=thumb&v=1`)
        .buffer(true)
        .expect(200);
      const meta = await sharp(thumb.body as Buffer).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 256 });

      const crop = await author
        .patch(`${url(id)}/image`)
        .send({ thumbCrop: { x: 0, y: 0, size: 100 } })
        .expect(200);
      expect(crop.body).toMatchObject({ version: 2 });
      await author
        .patch(`${url(id)}/image`)
        .send({ thumbCrop: { x: 900, y: 0, size: 100 } })
        .expect(400);
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ image: { version: 2 } });

      await author.delete(`${url(id)}/image`).expect(204);
      await author.delete(`${url(id)}/image`).expect(404);
    });
  });
}
