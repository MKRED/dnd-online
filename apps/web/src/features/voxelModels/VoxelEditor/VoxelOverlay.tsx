import { useMemo } from 'react';
import { MODEL_CELL_VOXELS, type Vec3 } from 'shared';
import { allCells } from '../voxelGeometry';
import { CELL_KIND_COLORS } from './cellKindColors';
import { brushCorner } from '../voxelBrush';
import { cellKind, type VoxelGrid } from '../voxelGrid';
import { cellOfVoxel, placeTarget, type VoxelHit } from '../voxelRaycast';
import type { VoxelEditorState } from './useVoxelEditor';

const TOOL_COLORS = {
  place: '#69db7c',
  erase: '#ff6b6b',
  paint: '#ffd43b',
  picker: '#ffffff',
  cells: '#ffffff',
};

function Box({
  corner,
  size,
  color,
  opacity,
}: {
  corner: Vec3;
  size: number;
  color: string;
  opacity: number;
}) {
  return (
    <mesh
      position={[
        corner[0] + size / 2,
        corner[1] + size / 2,
        corner[2] + size / 2,
      ]}
    >
      <boxGeometry args={[size + 0.04, size + 0.04, size + 0.04]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

// Кубики под указателем: куда встанет, что сотрётся или перекрасится — с зеркальными
// копиями; в режиме клеток — сама клетка.
function hoverBoxes(editor: VoxelEditorState, hit: VoxelHit): Vec3[] {
  const { tool, brush, mirror, grid } = editor;
  if (tool === 'cells')
    return [
      cellOfVoxel(hit.at).map((c) => c * MODEL_CELL_VOXELS) as unknown as Vec3,
    ];
  if (tool !== 'place' && hit.kind !== 'voxel') return [];
  const size = tool === 'picker' ? 1 : brush;
  const corner = brushCorner(
    tool === 'place' ? placeTarget(hit) : hit.at,
    size,
  );
  const [dx, , dz] = grid.dims;
  const xs =
    mirror.x && tool !== 'picker'
      ? [corner[0], dx - corner[0] - size]
      : [corner[0]];
  const zs =
    mirror.z && tool !== 'picker'
      ? [corner[2], dz - corner[2] - size]
      : [corner[2]];
  return xs.flatMap((x) => zs.map((z): Vec3 => [x, corner[1], z]));
}

function CellKinds({ grid, version }: { grid: VoxelGrid; version: number }) {
  // Свойства «как есть» зависят от вокселей — пересчёт на каждую правку.
  const cells = useMemo(
    () =>
      allCells(grid.size).flatMap((cell) => {
        const kind = cellKind(grid, cell);
        const own = `${cell.join(',')}` in grid.cells;
        return kind === 'free' && !own ? [] : [{ cell, kind, own }];
      }),
    // version — правка вокселей на месте, без новой сетки.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid, version],
  );
  return cells.map(({ cell, kind, own }) => (
    <Box
      key={cell.join(',')}
      corner={cell.map((c) => c * MODEL_CELL_VOXELS) as unknown as Vec3}
      size={MODEL_CELL_VOXELS}
      color={CELL_KIND_COLORS[kind]}
      opacity={own ? 0.35 : 0.15}
    />
  ));
}

interface VoxelOverlayProps {
  editor: VoxelEditorState;
  hover: VoxelHit | null;
}

function VoxelOverlay({ editor, hover }: VoxelOverlayProps) {
  const size =
    editor.tool === 'cells'
      ? MODEL_CELL_VOXELS
      : editor.tool === 'picker'
        ? 1
        : editor.brush;
  return (
    <>
      {editor.tool === 'cells' && (
        <CellKinds grid={editor.grid} version={editor.change.version} />
      )}
      {hover &&
        hoverBoxes(editor, hover).map((corner) => (
          <Box
            key={corner.join(',')}
            corner={corner}
            size={size}
            color={TOOL_COLORS[editor.tool]}
            opacity={0.35}
          />
        ))}
    </>
  );
}

export default VoxelOverlay;
