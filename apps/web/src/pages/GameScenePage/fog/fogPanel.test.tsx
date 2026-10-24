import { fireEvent, screen } from '@testing-library/react';
import {
  applyOps,
  createMask,
  createMapObjects,
  createPalette,
  emptyObjectRefs,
  maskAdd,
  MemoryChunkStore,
  readCell,
  type MapObject,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import FogPanel from './FogPanel';
import { playersView } from './playersView';
import type { SceneFogControls } from './useSceneFog';

function controls(over: Partial<SceneFogControls> = {}): SceneFogControls {
  return {
    busy: false,
    error: null,
    fogOn: true,
    sightRange: 60,
    eyes: false,
    setEyes: vi.fn(),
    save: vi.fn(),
    refresh: vi.fn(),
    reset: vi.fn(),
    resetState: 'idle',
    resetError: null,
    masks: null,
    ...over,
  };
}

describe('FogPanel', () => {
  it('turns the fog on with the current range', () => {
    const fog = controls({ fogOn: false });
    renderWithProviders(<FogPanel fog={fog} />);
    expect(screen.getByText('Игроки видят всю сцену.')).toBeInTheDocument();
    // Без тумана смотреть глазами игроков нечего.
    expect(screen.getByLabelText('Глазами игроков')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Туман войны'));
    expect(fog.save).toHaveBeenCalledWith({ enabled: true, sightRange: 60 });
  });

  it('saves the range on Enter, rounded to a cell and kept within the limit', () => {
    const fog = controls();
    renderWithProviders(<FogPanel fog={fog} />);
    const input = screen.getByLabelText('Дальность обзора, фт');
    fireEvent.change(input, { target: { value: '33' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(fog.save).toHaveBeenLastCalledWith({
      enabled: true,
      sightRange: 35,
    });
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.blur(input);
    expect(fog.save).toHaveBeenLastCalledWith({
      enabled: true,
      sightRange: 120,
    });
  });

  it('switches to the players’ eyes', () => {
    const fog = controls();
    renderWithProviders(<FogPanel fog={fog} />);
    fireEvent.click(screen.getByLabelText('Глазами игроков'));
    expect(fog.setEyes).toHaveBeenCalledWith(true);
  });
});

describe('playersView', () => {
  it('leaves only explored blocks and the objects the party sees', () => {
    const map = {
      store: new MemoryChunkStore(),
      palette: createPalette(),
      size: { width: 8, depth: 8 },
      objects: createMapObjects(),
    };
    applyOps(map, [
      { op: 'fillBox', from: [0, 0, 0], to: [7, 0, 7], block: 'stone' },
    ]);
    const objects: MapObject[] = [
      {
        id: 1,
        at: [0, 1, 0],
        hidden: false,
        kind: 'item',
        itemId: '00000000-0000-4000-8000-0000000000aa',
        quantity: 1,
      },
      // Старт в открытом — разметка мастера, игрок её не видит.
      { id: 9, at: [1, 1, 0], hidden: false, kind: 'start', facing: 0 },
      {
        id: 2,
        at: [1, 1, 0],
        hidden: false,
        kind: 'monster',
        monsterId: 'g',
        facing: 0,
      },
      {
        id: 3,
        at: [0, 1, 1],
        hidden: true,
        kind: 'monster',
        monsterId: 'g',
        facing: 0,
      },
    ];
    for (const object of objects) map.objects.byId.set(object.id, object);
    const fog = { explored: createMask(), visible: createMask() };
    for (const cell of [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 1],
    ] as const) {
      maskAdd(fog.explored, cell);
    }
    // Гоблин в открытом, но сейчас его не видно; скрытый — виден, но скрыт мастером.
    maskAdd(fog.visible, [0, 1, 1]);
    const seen = playersView(map, fog, emptyObjectRefs());
    expect(readCell(seen.store, [0, 0, 0])).not.toBe(0);
    expect(readCell(seen.store, [5, 0, 5])).toBe(0);
    expect([...seen.objects.byId.keys()]).toEqual([1]);
    // Повтор с теми же масками — те же массивы чанков: сцена их не пересобирает.
    const again = playersView(map, fog, emptyObjectRefs());
    expect(again.store.get('0,0,0')).toBe(seen.store.get('0,0,0'));
  });
});
