import { createContext, useContext } from 'react';
import { BASE_BLOCKS, type BlockCatalog } from 'shared';

// Каталог блоков карты для окна выбора блока: базовые блоки и свои группы владельца
// (docs/plan/blocks.md, этап 6а). Через контекст, а не пропсами: подписи и значки нужны
// в каждой плитке окна. Без провайдера — только базовые блоки.
export const BlockCatalogContext = createContext<BlockCatalog>(BASE_BLOCKS);

export const useBlockCatalog = () => useContext(BlockCatalogContext);
