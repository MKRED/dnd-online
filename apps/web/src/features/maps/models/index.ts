// 3D-модели существ на сцене (docs/plan/done/character-models.md). Грузит three — поэтому
// не реэкспортируется из features/maps: подключать только из ленивых модулей сцены.
export { default as FittedFigure } from './FittedFigure';
export { default as ModelFigure } from './ModelFigure';
export { default as PreviewGuides } from './PreviewGuides';
export { modelTop, placedHeight, placeModel, type ModelBox } from './modelFit';
export type { LoadedModel } from './loadModel';
export { useModel, type ModelState } from './useModel';
