import { describe, expect, it, vi } from 'vitest';
import { editFigureDrag } from './editFigureDrag';

const handlers = () => ({
  onGrab: vi.fn(),
  onRelease: vi.fn(),
  onSelect: vi.fn(),
});

describe('editFigureDrag', () => {
  it('в «Игре» — обработчики как есть', () => {
    const drag = handlers();
    expect(
      editFigureDrag({
        drag,
        editing: false,
        tool: 'place',
        clearCreature: vi.fn(),
        onOpen: vi.fn(),
      }),
    ).toBe(drag);
  });

  it('в «Просмотре» фигурку не тянут: выбор и окно по двойному щелчку', () => {
    const onOpen = vi.fn();
    const shown = editFigureDrag({
      drag: handlers(),
      editing: true,
      tool: 'view',
      clearCreature: vi.fn(),
      onOpen,
    });
    expect(shown?.onGrab).toBeUndefined();
    expect(shown?.onOpen).toBe(onOpen);
  });

  it('в «Существах» выбор героя снимает выбранное существо', () => {
    const drag = handlers();
    const clearCreature = vi.fn();
    const shown = editFigureDrag({
      drag,
      editing: true,
      tool: 'creatures',
      clearCreature,
      onOpen: vi.fn(),
    });
    shown?.onGrab?.('c1');
    shown?.onSelect?.('c1');
    expect(clearCreature).toHaveBeenCalledTimes(2);
    expect(drag.onGrab).toHaveBeenCalledWith('c1');
    expect(drag.onSelect).toHaveBeenCalledWith('c1');
  });

  it('«Строить» и ластик фигурки не трогают', () => {
    expect(
      editFigureDrag({
        drag: handlers(),
        editing: true,
        tool: 'place',
        clearCreature: vi.fn(),
        onOpen: vi.fn(),
      }),
    ).toBeUndefined();
  });
});
