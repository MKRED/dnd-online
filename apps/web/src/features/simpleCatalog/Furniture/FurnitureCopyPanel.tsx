import { apiRequest } from '../../../lib/apiRequest';
import { copyPanel } from '../CopyPanel';

// Копирование и обновление копии на карточке обстановки (docs/plan/blocks.md, этап 8б):
// вместе с записью копируется и её модель.
const FurnitureCopyPanel = copyPanel({
  path: '/furniture',
  copy: (id) => apiRequest(`/furniture/${id}/copy`, { method: 'POST' }),
  pull: (id) => apiRequest(`/furniture/${id}/pull`, { method: 'POST' }),
  texts: {
    copyOf: 'Копия обстановки',
    updated: 'Автор обновил обстановку',
    pullConfirm:
      'Крепление и модель станут как у оригинала — ваши правки в них пропадут. Название, описание и источники останутся. Подтянуть обновления?',
    copyFailed: 'Не удалось скопировать обстановку',
    copyHint:
      'Скопируется и её модель — своя копия, её можно править, а обновления автора подтягивать.',
  },
});

export default FurnitureCopyPanel;
