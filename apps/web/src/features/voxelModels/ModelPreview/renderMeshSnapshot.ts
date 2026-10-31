import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
} from 'three';
import { STL_DEFAULT_COLOR, type VoxelModelFields } from 'shared';
import {
  disposeMeshObjectCopy,
  fittedMeshGroup,
  meshFitPlacement,
  meshObjectCopy,
} from '../mesh/meshObject';
import { loadMeshModel } from '../mesh/useMeshModel';
import { cameraFor } from '../voxelCamera';
import { gridFromFields } from '../voxelGrid';
import type { PreviewMesh } from './ModelPreview';
import { getThumbnailRenderer } from './renderThumbnail';

// Сторона снимка: сервер делает из него миниатюру 256 px.
const SNAPSHOT_SIZE = 512;

// Снимок модели с загруженным файлом для списка (docs/plan/blocks.md, этап 9г): тот же
// ракурс и свет, что у предпросмотра на карточке (три четверти спереди-сбоку и сверху,
// решено с пользователем 2026-11-01), без клеток и стрелки. Рисовать его в списке на
// лету значило бы качать файл каждой модели (до 10 МБ), поэтому снимок делается при
// сохранении и хранится картинкой записи. null — WebGL нет или у файла нет объёма.
export async function meshSnapshot(
  model: VoxelModelFields,
  mesh: PreviewMesh,
): Promise<Blob | null> {
  const loaded = await loadMeshModel(mesh.source);
  const gl = getThumbnailRenderer();
  const placement = meshFitPlacement(loaded.box, mesh.fit, model.size);
  if (!gl || !placement) return null;
  const color =
    loaded.format === 'stl' ? (mesh.color ?? STL_DEFAULT_COLOR) : null;
  const object = meshObjectCopy(loaded, color);
  try {
    const { dims } = gridFromFields(model);
    const scene = new Scene();
    scene.add(new HemisphereLight('#ffffff', '#5a5048', 1.2));
    const sun = new DirectionalLight('#ffffff', 1.4);
    sun.position.set(60, 120, -80);
    const fill = new DirectionalLight('#ffffff', 0.4);
    fill.position.set(-80, 40, 60);
    scene.add(sun, fill);
    const group = fittedMeshGroup(object, placement, mesh.fit);
    group.position.x -= dims[0] / 2;
    group.position.z -= dims[2] / 2;
    scene.add(group);
    const view = cameraFor(dims, true);
    const camera = new PerspectiveCamera(40, 1, 0.1, 4000);
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    // Как у холста react-three-fiber на карточке; воксельным миниатюрам — без него.
    gl.toneMapping = ACESFilmicToneMapping;
    gl.setPixelRatio(1);
    gl.setSize(SNAPSHOT_SIZE, SNAPSHOT_SIZE, false);
    gl.render(scene, camera);
    gl.toneMapping = NoToneMapping;
    return await new Promise<Blob | null>((resolve) =>
      gl.domElement.toBlob(resolve, 'image/png'),
    );
  } finally {
    disposeMeshObjectCopy(loaded, object);
  }
}
