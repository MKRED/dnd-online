import { copyVoxelModel, pullVoxelModel } from '../../voxelModels';
import { copyPanel } from '../CopyPanel';

// Копирование и обновление копии на карточке модели — как у групп блоков
// (docs/plan/blocks.md, этапы 6б и 8а).
const ModelCopyPanel = copyPanel({
  path: '/models',
  copy: copyVoxelModel,
  pull: pullVoxelModel,
  texts: {
    copyOf: 'Копия модели',
    updated: 'Автор обновил модель',
    pullConfirm:
      'Воксели, цвета и свойства клеток станут как у оригинала — ваши правки в них пропадут. Название, описание и источники останутся. Подтянуть обновления?',
    copyFailed: 'Не удалось скопировать модель',
    copyHint:
      'Своя копия — её можно править и ставить в свою обстановку, а обновления автора подтягивать.',
  },
});

export default ModelCopyPanel;
