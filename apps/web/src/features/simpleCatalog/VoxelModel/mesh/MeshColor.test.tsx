import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { Group } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { renderWithProviders } from '../../../../test/render';
import { SimpleCreatePage } from '../../SimpleFormPage';
import { MODELS } from '../../simpleCatalogs';

// Смена цвета STL в форме модели (docs/plan/blocks.md, этап 9): воксели пересчитываются
// настоящим MeshVoxelizer, а вместо разбора файла — готовая пустая модель (в jsdom нет WebGL).
const READY = {
  status: 'ready',
  model: { format: 'stl', object: new Group(), box: null },
} as const;
vi.mock('../../../voxelModels/mesh/useMeshModel', () => ({
  useMeshModel: () => READY,
}));
vi.mock('../../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../voxelModels')>()),
  ModelPreview: () => <div>Предпросмотр модели</div>,
}));

const AUTHOR = '11111111-1111-4111-8111-111111111111';

// STL с одним треугольником: формат узнаётся по первым байтам.
function smallStl() {
  const bytes = new Uint8Array(84 + 50);
  new DataView(bytes.buffer).setUint32(80, 1, true);
  return new File([bytes], 'cube.stl');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('цвет STL в форме модели', () => {
  it('воксели досчитываются, даже если поле цвета повторит цвет до перерисовки', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('[]'))),
    );
    renderWithProviders(
      <Routes>
        <Route path="/models/new" element={<SimpleCreatePage def={MODELS} />} />
      </Routes>,
      {
        route: '/models/new',
        auth: {
          user: {
            id: AUTHOR,
            login: 'u',
            nickname: 'u',
            settings: DEFAULT_USER_SETTINGS,
          },
        },
      },
    );
    await screen.findByLabelText(/Название/);
    const file = document.querySelector(
      'input[type=file][accept*=".glb"]',
    ) as HTMLInputElement;
    await userEvent.upload(file, smallStl());
    const color = await screen.findByLabelText('Цвет');
    await waitFor(() =>
      expect(screen.queryByText(/Считаем воксели/)).not.toBeInTheDocument(),
    );

    // Так бывает при перетаскивании по палитре: она шлёт тот же цвет ещё раз, пока форма
    // не перерисовалась после пересчёта вокселей.
    act(() => {
      fireEvent.change(color, { target: { value: '#11aabb' } });
      fireEvent.change(color, { target: { value: '#11AABB' } });
    });

    await waitFor(() =>
      expect(screen.queryByText(/Считаем воксели/)).not.toBeInTheDocument(),
    );
    expect(color).toHaveValue('#11aabb');
  });
});
