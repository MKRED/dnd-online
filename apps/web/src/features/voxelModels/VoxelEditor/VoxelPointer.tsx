import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Raycaster, Vector2 } from 'three';
import type { Vec3 } from 'shared';
import { castVoxelRay, type VoxelHit } from '../voxelRaycast';
import type { VoxelEditorState } from './useVoxelEditor';

interface VoxelPointerProps {
  editor: VoxelEditorState;
  // Сдвиг сетки в сцене: модель стоит серединой основания в начале координат.
  offset: Vec3;
  onHover: (hit: VoxelHit | null) => void;
}

// Указатель над холстом редактора: левая кнопка или один палец — инструмент. Камеру
// крутят правая кнопка и два пальца (OrbitControls), поэтому второй палец посреди мазка
// откатывает его.
function VoxelPointer({ editor, offset, onHover }: VoxelPointerProps) {
  const { gl, camera } = useThree();
  // Свежие обработчики без переподписки на каждой отрисовке.
  const current = useRef({ editor, offset, onHover });
  useEffect(() => {
    current.current = { editor, offset, onHover };
  });

  useEffect(() => {
    const element = gl.domElement;
    const raycaster = new Raycaster();
    const pointers = new Set<number>();
    let drawing = false;

    const hitAt = (event: PointerEvent): VoxelHit | null => {
      const rect = element.getBoundingClientRect();
      const ndc = new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const { origin, direction } = raycaster.ray;
      const { editor: state, offset: shift } = current.current;
      return castVoxelRay(
        state.grid,
        [origin.x - shift[0], origin.y - shift[1], origin.z - shift[2]],
        [direction.x, direction.y, direction.z],
        state.sliceTop,
      );
    };

    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        if (drawing) current.current.editor.strokeCancel();
        drawing = false;
        return;
      }
      const hit = hitAt(event);
      if (!hit) return;
      drawing = true;
      element.setPointerCapture(event.pointerId);
      current.current.editor.strokeStart(hit);
    };
    const move = (event: PointerEvent) => {
      const hit = hitAt(event);
      current.current.onHover(hit);
      if (drawing && hit) current.current.editor.strokeMove(hit);
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (!drawing) return;
      drawing = false;
      current.current.editor.strokeEnd();
    };
    const leave = () => current.current.onHover(null);

    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('pointerleave', leave);
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('pointerleave', leave);
    };
  }, [gl, camera]);

  return null;
}

export default VoxelPointer;
