import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlockTextures } from 'shared';
import { tileFromBase64, tileToBase64, TILE_SIZE } from '../../../maps';
import { renderWithProviders } from '../../../../test/render';
import TileEditorModal from './TileEditorModal';
import { paintPixels, pixelAt } from './tilePixels';

// Плитка целиком одного серого цвета.
const grey = tileToBase64(
  paintPixels(
    new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4),
    Array.from(
      { length: TILE_SIZE * TILE_SIZE },
      (_, i) => [i % TILE_SIZE, Math.floor(i / TILE_SIZE)] as [number, number],
    ),
    '#808080',
  ),
);
const textures: BlockTextures = { top: grey, side: grey, bottom: grey };

// Холст 160×160 на экране: клетка плитки — 10 пикселей.
const CELL = 10;

beforeEach(() => {
  vi.spyOn(
    HTMLCanvasElement.prototype,
    'getBoundingClientRect',
  ).mockReturnValue(new DOMRect(0, 0, CELL * TILE_SIZE, CELL * TILE_SIZE));
  // В jsdom нет захвата указателя.
  HTMLElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderEditor() {
  const onDone = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <TileEditorModal
      target={{ face: 'top', mode: 'faces', title: 'Текстура: верх' }}
      textures={textures}
      shape="cube"
      look="stone"
      color="#808080"
      onDone={onDone}
      onClose={onClose}
    />,
  );
  return { onDone, onClose };
}

const canvas = () => screen.getByLabelText('Холст текстуры 16×16');

function stroke(points: [number, number][]) {
  const [first, ...rest] = points;
  const at = ([x, y]: [number, number]) => ({
    clientX: x * CELL + CELL / 2,
    clientY: y * CELL + CELL / 2,
    buttons: 1,
  });
  fireEvent.pointerDown(canvas(), at(first));
  for (const point of rest) fireEvent.pointerMove(canvas(), at(point));
  fireEvent.pointerUp(canvas());
}

const doneTile = (onDone: ReturnType<typeof vi.fn>) => {
  expect(onDone).toHaveBeenCalledTimes(1);
  const [face, tile] = onDone.mock.calls[0] as [string, string];
  expect(face).toBe('top');
  return tileFromBase64(tile);
};

describe('редактор текстуры', () => {
  it('карандаш выбранным цветом рисует линию без разрывов, «Готово» отдаёт плитку', async () => {
    const { onDone } = renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Цвет #c2372a' }));
    stroke([
      [0, 0],
      [4, 0],
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));

    const tile = doneTile(onDone);
    for (let x = 0; x <= 4; x++) expect(pixelAt(tile, x, 0)).toBe('#c2372a');
    expect(pixelAt(tile, 5, 0)).toBe('#808080');
  });

  it('ластик делает дыры, отмена возвращает мазок целиком', async () => {
    const { onDone } = renderEditor();
    await userEvent.click(screen.getByRole('radio', { name: /Ластик/ }));
    stroke([[1, 1]]);
    stroke([
      [3, 3],
      [3, 5],
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Отменить' }));
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));

    const tile = doneTile(onDone);
    expect(pixelAt(tile, 1, 1)).toBeNull();
    expect(pixelAt(tile, 3, 4)).toBe('#808080');
  });

  it('заливка красит связную область, пипетка берёт цвет', async () => {
    const { onDone } = renderEditor();
    await userEvent.click(screen.getByRole('radio', { name: 'Заливка' }));
    await userEvent.click(screen.getByRole('button', { name: 'Цвет #3f7d38' }));
    stroke([[8, 8]]);
    // Пипетка по зелёному и карандаш тем же цветом — плитка не меняется.
    await userEvent.click(screen.getByRole('radio', { name: 'Пипетка' }));
    stroke([[0, 0]]);
    expect(screen.getByRole('radio', { name: 'Карандаш' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));

    const tile = doneTile(onDone);
    expect(pixelAt(tile, 0, 0)).toBe('#3f7d38');
    expect(pixelAt(tile, 15, 15)).toBe('#3f7d38');
  });

  it('закрытие с правками спрашивает, без правок — нет', async () => {
    const { onDone, onClose } = renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    stroke([[2, 2]]);
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Закрыть без сохранения/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Рисовать дальше' }),
    );
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onDone).not.toHaveBeenCalled();
  });
});
