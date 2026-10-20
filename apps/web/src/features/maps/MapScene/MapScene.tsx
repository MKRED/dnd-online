import { useComputedColorScheme } from '@mantine/core';
import { MapControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useCallback, useState, type RefObject } from 'react';
import type { FacingMarker, MapObjectRefsView, ResizeOp } from 'shared';
import type { CameraPlacement, Point } from '../cameraView';
import type { SceneEditor } from '../editor/editorTools';
import type { ObjectToolScene } from '../editor/objects';
import type { MapViewState } from '../mapStateFromChunks';
import { useKeyCodes } from '../useKeyCodes';
import type { WalkScene } from '../walkTest';
import WalkLayer from './WalkLayer';
import CameraFocus, { type CameraFocusApi } from './CameraFocus';
import CameraRig from './CameraRig';
import CenterHint from './CenterHint';
import CursorReadout from './CursorReadout';
import { createHoverStore } from './hoverStore';
import EditLayer from './EditLayer';
import FigureLayer, { type FigureInput } from './figures';
import FirstFrame from './FirstFrame';
import ObjectLayer, { FacingMarkerContext } from './objects';
import type { ObjectImagePaths } from './objects/objectImages';
import ResizePreview from './ResizePreview';
import ChunkMesh from './ChunkMesh';
import { useChunkMeshes } from './useChunkMeshes';
import classes from './MapScene.module.css';

// Фон сцены под схему страницы: в тёмной — угольный чуть темнее фона страницы,
// в светлой — тёмный пергамент, как стол под картой.
const SCENE_BACKGROUND = { light: '#d8ccb2', dark: '#191613' };

interface MapSceneProps {
  map: MapViewState;
  // Имена и картинки того, на что ссылаются объекты карты.
  refs: MapObjectRefsView;
  // Срез по высоте: клетки выше не рисуются.
  cutY: number;
  // Начальная камера (из адреса страницы); дальше ей управляет пользователь.
  camera: CameraPlacement;
  // Набираемое изменение размера: новая граница видна до «Применить».
  resizePreview: ResizeOp['grow'] | null;
  // Инструмент редактора; null — только просмотр.
  editor: SceneEditor | null;
  // Проверка хода (фигурка и куда она дойдёт): видна при любом инструменте,
  // чтобы правки карты сразу сказывались на ней.
  walk: WalkScene | null;
  // Инструмент «Объекты»: выделение и перетаскивание; null — другой инструмент.
  objectTool: ObjectToolScene | null;
  // Центр камеры: его двигают и сцена (двойной клик, Q/E), и страница (объект из
  // списка «На карте»).
  focusRef: RefObject<CameraFocusApi | null>;
  // Сцена отрисована с картинками объектов (см. FirstFrame).
  onReady: () => void;
  // Вид отметки взгляда на подставках — из настроек пользователя.
  facingMarker: FacingMarker;
  // Откуда миниатюры объектов: сцена игры берёт их из библиотеки игры. Без него — из
  // справочников. Держать один объект на сцену: новый перестраивает объекты.
  objectImages?: ObjectImagePaths;
  // Содержимое контейнеров смотрящему не отдали (игрок на сцене игры).
  hideContainerContents?: boolean;
  // Фигурки персонажей на сцене игры (этап 7); в редакторе карты их нет.
  figures?: readonly FigureInput[];
}

function MapScene({
  map,
  refs,
  cutY,
  camera,
  resizePreview,
  editor,
  walk,
  objectTool,
  focusRef: focus,
  onReady,
  facingMarker,
  objectImages,
  hideContainerContents,
  figures,
}: MapSceneProps) {
  const chunks = useChunkMeshes(map, cutY);
  const scheme = useComputedColorScheme('dark');
  // Центр камеры живёт внутри Canvas (CameraFocus), а подсказка с кнопками и клавиши
  // Q/E — снаружи, в обычном DOM; связывает их ref focus.
  const [centerLevel, setCenterLevel] = useState<number | null>(null);
  const [hover] = useState(createHoverStore);
  // Миниатюры объектов догрузились (или не загрузились) — только после этого первый
  // кадр считается готовым, иначе на снимке пустые карточки.
  const [imagesSettled, setImagesSettled] = useState(false);
  const settleImages = useCallback(() => setImagesSettled(true), []);
  const shiftLevel = (dy: number) => focus.current?.shiftLevel(dy);
  const focusOn = (point: Point) => focus.current?.focusOn(point);
  // Q опускает центр камеры, E поднимает (docs/plan/done/map-editor.md, «Камера»).
  useKeyCodes({ KeyQ: () => shiftLevel(-1), KeyE: () => shiftLevel(1) });

  return (
    <div className={classes.canvas}>
      <Canvas
        frameloop="demand"
        camera={{ position: camera.position, fov: 45, near: 0.1, far: 5000 }}
      >
        <color attach="background" args={[SCENE_BACKGROUND[scheme]]} />
        <hemisphereLight args={['#ffffff', '#3a3530', 0.9]} />
        <directionalLight position={[40, 80, 30]} intensity={1.6} />
        <EditLayer
          editor={editor}
          size={map.size}
          onFocus={focusOn}
          readout={hover}
        >
          {[...chunks].map(([key, { meshes }]) => (
            <group key={key}>
              {meshes.opaque && (
                <ChunkMesh buffers={meshes.opaque} transparent={false} />
              )}
              {meshes.transparent && (
                <ChunkMesh buffers={meshes.transparent} transparent />
              )}
            </group>
          ))}
        </EditLayer>
        <FacingMarkerContext value={facingMarker}>
          <ObjectLayer
            state={map}
            refs={refs}
            cutY={cutY}
            onImagesSettled={settleImages}
            tool={objectTool}
            hover={hover}
            images={objectImages}
            hideContents={hideContainerContents}
          />
          {figures && <FigureLayer map={map} figures={figures} cutY={cutY} />}
        </FacingMarkerContext>
        {walk && <WalkLayer walk={walk} />}
        {resizePreview && (
          <ResizePreview size={map.size} grow={resizePreview} />
        )}
        {/* Колесо приближает к точке под курсором: в редакторе приближаются к тому,
            что собираются править. Высота центра при этом не меняется. */}
        <MapControls makeDefault zoomToCursor />
        <CameraRig placement={camera} />
        {/* После CameraRig: первый уровень для подсказки берётся из уже поставленной камеры. */}
        <CameraFocus apiRef={focus} onLevel={setCenterLevel} />
        {imagesSettled && <FirstFrame onReady={onReady} />}
      </Canvas>
      <CenterHint level={centerLevel} onShift={shiftLevel} />
      <CursorReadout hover={hover} editor={editor} />
    </div>
  );
}

export default MapScene;
