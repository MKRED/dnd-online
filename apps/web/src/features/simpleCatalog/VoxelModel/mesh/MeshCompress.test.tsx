import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { renderWithProviders } from '../../../../test/render';
import { compressInWorker } from '../../../modelCompress/compressInWorker';
import { SimpleCreatePage } from '../../SimpleFormPage';
import { MODELS } from '../../simpleCatalogs';

// Сжатие тяжёлого файла в форме модели (docs/plan/done/monster-models.md, этап 3). В jsdom нет
// ни WebGL, ни Web Worker: предпросмотр, воксели из файла и сжатие — заглушки.
vi.mock('../../../voxelModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../voxelModels')>()),
  ModelPreview: () => <div>Предпросмотр модели</div>,
  MeshVoxelizer: () => null,
}));
vi.mock('../../../modelCompress/compressInWorker', () => ({
  compressInWorker: vi.fn(),
}));

const MB = 1024 * 1024;
const AUTHOR = '11111111-1111-4111-8111-111111111111';

// Файл с нужным размером без настоящих мегабайт в памяти теста.
function fileOfSize(name: string, size: number) {
  const file = new File(['solid x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

// Сжатый STL с одним треугольником: формат узнаётся по первым байтам.
function smallStl() {
  const bytes = new Uint8Array(84 + 50);
  new DataView(bytes.buffer).setUint32(80, 1, true);
  return bytes;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('сжатие файла в форме модели', () => {
  it('предлагает сжать, не сохраняет форму во время сжатия, итог — у файла', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response('[]')),
    );
    vi.stubGlobal('fetch', fetchMock);
    let finish: () => void = () => {};
    vi.mocked(compressInWorker).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              data: smallStl(),
              before: { bytes: 54 * MB, triangles: 1_200_000 },
              after: { bytes: 8.6 * MB, triangles: 178_000 },
            });
        }),
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
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Название/), 'Огр');
    const input = document.querySelector(
      'input[type=file][accept*=".glb"]',
    ) as HTMLInputElement;
    await user.upload(input, fileOfSize('ogre.stl', 54 * MB));
    expect(screen.getByText(/«ogre\.stl» весит 54,0 МБ/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Сжать' }));
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(
      await screen.findByText('Файл модели ещё сжимается — подождите'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(
      false,
    );

    finish();
    expect(
      await screen.findByText(
        'Сжато: было 54,0 МБ · 1,2 млн треугольников → стало 8,6 МБ · 178 тыс. треугольников.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Загружена из файла STL/)).toBeInTheDocument();
  });

  it('файл больше 100 МБ — отказ без сжатия', async () => {
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
    const input = document.querySelector(
      'input[type=file][accept*=".glb"]',
    ) as HTMLInputElement;
    await userEvent.upload(input, fileOfSize('huge.stl', 120 * MB));
    expect(
      screen.getByText(/Файл больше 100 МБ — такой не сжать/),
    ).toBeInTheDocument();
    expect(compressInWorker).not.toHaveBeenCalled();
  });
});
