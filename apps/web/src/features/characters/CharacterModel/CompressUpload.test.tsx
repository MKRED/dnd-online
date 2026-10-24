import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterModel } from 'shared';
import { renderWithProviders } from '../../../test/render';
import CharacterModelBlock from './CharacterModelBlock';
import { ModelCompressError } from '../../modelCompress/compressLimits';
import { compressInWorker } from '../../modelCompress/compressInWorker';

// В jsdom нет ни WebGL, ни Web Worker: сцена и сжатие — заглушки, тут — только ход
// выбора файла в блоке «3D-модель».
vi.mock('./ModelPreview', () => ({ default: () => <div>Предпросмотр</div> }));
vi.mock('../../modelCompress/compressInWorker', () => ({
  compressInWorker: vi.fn(),
}));

const MB = 1024 * 1024;

const uploaded: CharacterModel = {
  format: 'stl',
  size: 8.7 * MB,
  version: 1,
  color: '#9a948a',
  fit: { scale: 1, turn: 0, up: 'z' },
  updatedAt: '2026-10-23T00:00:00.000Z',
};

function stubFetch() {
  const fetchMock = vi.fn<typeof fetch>((_url, init) =>
    Promise.resolve(
      init?.method === 'PUT'
        ? new Response(JSON.stringify(uploaded))
        : new Response(JSON.stringify({ model: null })),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// Файл с нужным размером без настоящих мегабайт в памяти теста.
function fileOfSize(name: string, size: number) {
  const file = new File(['solid x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

async function pick(file: File) {
  await screen.findByRole('button', { name: 'Загрузить модель' });
  const input = document.querySelector('input[type=file]') as HTMLInputElement;
  await userEvent.upload(input, file);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Сжатие тяжёлой модели в блоке «3D-модель»', () => {
  it('файл больше 10 МБ: предложение, сжатие, загрузка сжатого и итог', async () => {
    const fetchMock = stubFetch();
    vi.mocked(compressInWorker).mockImplementation((_file, onProgress) => {
      onProgress({ stage: 'simplify', pass: 1, passes: 4 });
      return Promise.resolve({
        data: new Uint8Array(84),
        before: { bytes: 54 * MB, triangles: 1_200_000 },
        after: { bytes: 8.7 * MB, triangles: 180_000 },
      });
    });
    renderWithProviders(<CharacterModelBlock characterId="c1" />);

    await pick(fileOfSize('dragon.stl', 54 * MB));
    expect(screen.getByText(/«dragon\.stl» весит 54,0 МБ/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(
      false,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Сжать и загрузить' }),
    );

    expect(
      await screen.findByText(
        'Сжато: было 54,0 МБ · 1,2 млн треугольников → стало 8,7 МБ · 180 тыс. треугольников.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(
        true,
      ),
    );
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT');
    const sent = (put?.[1]?.body as FormData).get('file') as File;
    expect(sent.name).toBe('dragon.stl');
    expect(sent.size).toBe(84);
  });

  it('«Отмена» ничего не загружает; ошибка сжатия видна', async () => {
    const fetchMock = stubFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(compressInWorker).mockRejectedValue(
      new ModelCompressError('Не удалось сжать модель до 9 МБ.'),
    );
    renderWithProviders(<CharacterModelBlock characterId="c1" />);

    await pick(fileOfSize('a.glb', 20 * MB));
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByText(/весит/)).not.toBeInTheDocument();

    await pick(fileOfSize('a.glb', 20 * MB));
    await userEvent.click(
      screen.getByRole('button', { name: 'Сжать и загрузить' }),
    );
    expect(
      await screen.findByText('Не удалось сжать модель до 9 МБ.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(
      false,
    );
  });

  it('файл больше 100 МБ — отказ без сжатия', async () => {
    stubFetch();
    renderWithProviders(<CharacterModelBlock characterId="c1" />);

    await pick(fileOfSize('huge.stl', 120 * MB));

    expect(
      screen.getByText(/Файл больше 100 МБ — такой не сжать/),
    ).toBeInTheDocument();
    expect(compressInWorker).not.toHaveBeenCalled();
  });
});
