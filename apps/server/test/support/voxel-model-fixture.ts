import type request from 'supertest';
import { bytesToBase64, encodeVoxels, modelVoxelCount } from 'shared';

// Модель справочника «Модели» и файлы для её загрузки — для тестов файла модели и
// моделей монстров.

// Наименьший двоичный STL: заголовок, число треугольников и по 50 байт на каждый.
export function stl(triangles: number): Buffer {
  const bytes = Buffer.alloc(84 + triangles * 50);
  bytes.writeUInt32LE(triangles, 80);
  return bytes;
}

// Заголовок `.glb`: «glTF», версия 2 и длина файла.
export function glb(): Buffer {
  const bytes = Buffer.alloc(20);
  bytes.write('glTF', 0, 'ascii');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(20, 8);
  return bytes;
}

export const modelBody = (isPublic = false) => {
  const voxels = new Uint8Array(modelVoxelCount([1, 1, 1]));
  voxels[0] = 1;
  return {
    name: 'Статуя',
    description: '',
    isPublic,
    size: [1, 1, 1],
    palette: ['#9a948a'],
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: {},
  };
};

export async function createModel(
  agent: request.Agent,
  isPublic = false,
): Promise<string> {
  const res = await agent
    .post('/api/voxel-models')
    .send(modelBody(isPublic))
    .expect(201);
  return (res.body as { id: string }).id;
}

export const uploadMesh = (
  agent: request.Agent,
  id: string,
  file: Buffer,
  name: string,
) => agent.put(`/api/voxel-models/${id}/mesh`).attach('file', file, name);
