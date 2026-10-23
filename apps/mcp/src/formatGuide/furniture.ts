import {
  FURNITURE_MOUNT_LABELS,
  type FurnitureFields,
  type FurnitureInput,
} from 'shared';
import { fieldLines, labeled, sample } from './common.js';

const FIELDS = {
  name: 'название, до 100 символов',
  modelId:
    'id своей модели (search kind voxel_model, own: true); чужую сначала копируют в вебе. Размер на карте и свойства клеток — из модели',
  mount: `крепление: ${labeled(FURNITURE_MOUNT_LABELS)}. floor — стоит на опоре и занимает клетки для пути; wall — висит на стене спиной к блоку, ceiling — под блоком потолка; на стене и потолке клеток для пути не занимает, только закрывает вид`,
  description: 'описание',
  sources: 'источники — строки',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof FurnitureInput, string>;

const TABLE: FurnitureFields = {
  modelId: '<id своей модели>',
  mount: 'floor',
};

export const furnitureGuide = () => [
  'ОБСТАНОВКА (kind furniture) — стол, стул, статуя, картина: своя модель плюс крепление; на карту ставится объектом furniture (block_guide)',
  ...fieldLines(FIELDS),
  '',
  `Пример — стол: ${sample(TABLE)}`,
  '',
  '- В ответе get модель приходит целиком (поле model, null — модель удалили, обстановка без вида).',
];
