// MapScene (three.js) намеренно не реэкспортируется: страница грузит его лениво,
// чтобы three не попадал в основной бандл.
export {
  applyMapOps,
  createMap,
  deleteMap,
  getMap,
  getMapChunks,
  listMaps,
  redoMapEdit,
  undoMapEdit,
} from './mapsApi';
export { drawHealthMark, MARK_FONTS } from './healthMarkDraw';
export { mapSizeLabel } from './mapSizeLabel';
export { mapStateFromChunks } from './mapStateFromChunks';
export { useMapData, type LoadedMap } from './useMapData';
export { useRulesState } from './useRulesState';
export { ShapeSwatch } from './editor/BlockPicker';
// Текстуры своих групп блоков для раздела «Блоки» (docs/plan/blocks.md, этап 4б).
export {
  decodeTextures,
  tileFromBase64,
  tileToBase64,
} from './render/textures/customTiles';
export {
  downscaleTile,
  meanTextureColor,
} from './render/textures/downscaleTile';
export { materialTextures } from './render/textures/materialTextures';
export { ownTileImage } from './render/textures/tileImages';
export { TILE_SIZE, type Tile } from './render/textures/pixels';
export { pngDataUrl } from './render/textures/encodePng';
export { useKeyCodes } from './useKeyCodes';
