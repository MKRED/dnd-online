import { copyPanel } from '../CopyPanel';
import { copyBlockGroup, pullBlockGroup } from './blockCopyApi';

// Копирование и обновление копии на карточке группы блоков (docs/plan/blocks.md,
// этап 6б) — общая панель копий простого каталога.
const BlockCopyPanel = copyPanel({
  path: '/blocks',
  copy: copyBlockGroup,
  pull: pullBlockGroup,
  texts: {
    copyOf: 'Копия блока',
    updated: 'Автор обновил блок',
    pullConfirm:
      'Вид и свойства группы станут как у оригинала — ваши правки в них пропадут. Название, описание и источники останутся. Подтянуть обновления?',
    copyFailed: 'Не удалось скопировать группу блоков',
    copyHint:
      'Своя копия — её можно править и ставить на свои карты, а обновления автора подтягивать.',
  },
});

export default BlockCopyPanel;
