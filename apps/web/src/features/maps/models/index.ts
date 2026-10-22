// 3D-модели существ на сцене (docs/plan/character-models.md). Грузит three — поэтому
// не реэкспортируется из features/maps: подключать только из ленивых модулей сцены.
export { default as ModelFigure } from './ModelFigure';
export { placedHeight, placeModel } from './modelFit';
export type { LoadedModel } from './loadModel';
export { useModel, type ModelState } from './useModel';
