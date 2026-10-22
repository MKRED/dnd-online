import type { BlockCatalog } from './blockInfo.js';
import type { ChunkStore } from './chunkStore.js';
import type { Palette } from './palette.js';

// Состояние блоков карты: чанки и палитра, к которой относятся id в клетках.
// Палитра обязана путешествовать вместе с чанками — без неё значения клеток бессмысленны.
export interface MapState {
  store: ChunkStore;
  palette: Palette;
  // Откуда правила берут описания блоков палитры; без него — встроенные (BASE_BLOCKS).
  blocks?: BlockCatalog;
}
