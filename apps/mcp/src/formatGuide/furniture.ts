import {
  FURNITURE_MOUNT_LABELS,
  FURNITURE_POSITIONS_MAX,
  CONTAINER_CAPACITY_MAX,
  LOCK_DCS,
  type FurnitureFields,
  type FurnitureInput,
} from 'shared';
import { fieldLines, labeled, sample } from './common.js';

const FIELDS = {
  name: 'название, до 100 символов',
  modelId:
    'id своей модели (search kind voxel_model, own: true); чужую сначала копируют в вебе. Размер на карте и свойства клеток — из модели',
  mount: `крепление: ${labeled(FURNITURE_MOUNT_LABELS)}. floor — стоит на опоре и занимает клетки для пути; wall — висит на стене спиной к блоку, ceiling — под блоком потолка; на стене и потолке клеток для пути не занимает, только закрывает вид; doorway — дверь или ворота: клетки объекта — сам проём, стоит на полу проёма`,
  positions: `положения [{name, modelId}] — у двери «Закрыта» и «Открыта», у сундука «Закрыт» и «Открыт»: от 2 до ${FURNITURE_POSITIONS_MAX} со своими моделями (только свои), или [] — один вид. Первое — то, в котором объект ставится на карту, его modelId — modelId записи`,
  container: `null — обычная обстановка; контейнер (сундук, шкаф, бочка) — {capacity: вместимость в фунтах до ${CONTAINER_CAPACITY_MAX} (правило дома: 30 фнт. на кубический фут объёма из книги; сундук 360, бочка 120, мешок 30), lockDc: ${LOCK_DCS.join(', ')} (качество замка по DMG 2024) или null — без замка, contents: [{itemId, quantity}] — содержимое по умолчанию, предметы каталога (свои или опубликованные), груз не больше вместимости}`,
  description: 'описание',
  sources: 'источники — строки',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof FurnitureInput, string>;

const TABLE: FurnitureFields = {
  modelId: '<id своей модели>',
  mount: 'floor',
  positions: [],
  container: null,
};

const CHEST: FurnitureFields = {
  modelId: '<id модели закрытого сундука>',
  mount: 'floor',
  positions: [
    { name: 'Закрыт', modelId: '<id модели закрытого сундука>' },
    { name: 'Открыт', modelId: '<id модели открытого сундука>' },
  ],
  container: {
    capacity: 360,
    lockDc: 15,
    contents: [{ itemId: '<id предмета>', quantity: 50 }],
  },
};

const DOOR: FurnitureFields = {
  modelId: '<id модели закрытой двери>',
  mount: 'doorway',
  positions: [
    { name: 'Закрыта', modelId: '<id модели закрытой двери>' },
    { name: 'Открыта', modelId: '<id модели открытой двери>' },
  ],
  container: null,
};

export const furnitureGuide = () => [
  'ОБСТАНОВКА (kind furniture) — стол, стул, статуя, картина: своя модель плюс крепление; на карту ставится объектом furniture (block_guide)',
  ...fieldLines(FIELDS),
  '',
  `Пример — стол: ${sample(TABLE)}`,
  `Пример — дверь: ${sample(DOOR)}`,
  `Пример — сундук с хорошим замком и 50 монетами: ${sample(CHEST)}`,
  '',
  '- В ответе get модель приходит целиком (поле model, null — модель удалили, обстановка без вида), модели положений — в models по id.',
  '- Дверь в одной клетке, как в Minecraft: в закрытой модели створка поперёк проёма (клетка — препятствие), в открытой — створка у боковой грани той же клетки, и клетка помечена free. У моделей всех положений общая опорная клетка и «вперёд».',
];
