import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import {
  applyOps,
  createPalette,
  encodeChunk,
  MemoryChunkStore,
  parseChunkKey,
  type MapChunksResponse,
  type MapState,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import type { SceneEditor } from '../../features/maps/editor';
import { renderWithProviders } from '../../test/render';
import MapViewPage from './MapViewPage';

// В jsdom нет WebGL — вместо настоящей сцены заглушка, показывающая, что ей передали.
vi.mock('../../features/maps/MapScene', async () => {
  const { useEffect } = await import('react');
  return {
    default: function MapSceneStub({
      cutY,
      editor,
      onReady,
    }: {
      cutY: number;
      editor: SceneEditor | null;
      onReady: () => void;
    }) {
      useEffect(onReady, [onReady]);
      return (
        <>
          <p>Сцена, срез {String(cutY)}</p>
          {/* Клик по земле в клетке (1, 0, 1) — вместо луча по настоящей сцене. */}
          {editor && (
            <button
              onClick={() =>
                editor.onPick({
                  hit: null,
                  place: [1, 0, 1],
                  point: [1.5, 0, 1.5],
                  normal: [0, 1, 0],
                })
              }
            >
              Клик по земле
            </button>
          )}
        </>
      );
    },
  };
});

const MAP_ID = '11111111-1111-4111-8111-111111111111';
const info = {
  id: MAP_ID,
  name: 'Подземелье',
  seq: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function chunksOf(map: MapState, seq = 1): MapChunksResponse {
  return {
    seq,
    palette: map.palette,
    chunks: [...map.store.keys()].map((key) => {
      const [cx, cy, cz] = parseChunkKey(key);
      const bytes = encodeChunk(map.store.get(key)!);
      return { cx, cy, cz, data: btoa(String.fromCharCode(...bytes)) };
    }),
  };
}

const emptyChunks: MapChunksResponse = {
  seq: 0,
  palette: createPalette(),
  chunks: [],
};

function towerChunks() {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOps(map, [
    { op: 'fillBox', from: [0, 0, 0], to: [0, 4, 0], block: 'stone' },
  ]);
  return chunksOf(map);
}

function stubFetch(responses: { status: number; body?: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage(id = MAP_ID) {
  return renderWithProviders(
    <Routes>
      <Route path="/maps/:id" element={<MapViewPage />} />
    </Routes>,
    { route: `/maps/${id}` },
  );
}

describe('MapViewPage', () => {
  it('без среза в адресе показывает всю карту', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();

    expect(await screen.findByText('Сцена, срез Infinity')).toBeInTheDocument();
    expect(screen.getByText('Срез по высоте: 4')).toBeInTheDocument();
    expect(screen.getByText('Подземелье')).toBeInTheDocument();
    expect(await screen.findByText(/^Сцена готова/)).toBeInTheDocument();
  });

  it('берёт срез из адреса страницы и прижимает его к границам', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderWithProviders(
      <Routes>
        <Route path="/maps/:id" element={<MapViewPage />} />
      </Routes>,
      { route: `/maps/${MAP_ID}?y=2` },
    );

    expect(await screen.findByText('Сцена, срез 2')).toBeInTheDocument();
  });

  it('блок ставится кликом по земле, изменения применяются без перечитывания', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: info },
      { status: 200, body: emptyChunks },
      {
        status: 200,
        body: {
          seq: 1,
          changedCells: 1,
          conflicts: 0,
          paletteAdded: ['stone'],
          // Клетка (1, 0, 1): воздух → stone (id 1, поворот 0 → значение 4).
          changes: {
            cells: [1, 0, 1, 0, 4],
            paletteAdded: [{ id: 1, name: 'stone' }],
          },
        },
      },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Блок' }));
    await user.click(screen.getByRole('button', { name: 'Клик по земле' }));

    expect(await screen.findByText('Срез по высоте: 0')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toMatch(new RegExp(`/maps/${MAP_ID}/ops$`));
    expect(JSON.parse(init?.body as string)).toEqual({
      ops: [{ op: 'setBlock', at: [1, 0, 1], block: 'stone', rotation: 0 }],
    });
    // Сцена не перемонтировалась — «Сцена готова» остаётся.
    expect(screen.getByText('Сцена готова.')).toBeInTheDocument();
  });

  it('перечитывает карту, если между правками были чужие', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: info },
      { status: 200, body: emptyChunks },
      {
        status: 200,
        body: {
          seq: 5,
          changedCells: 1,
          conflicts: 0,
          paletteAdded: [],
          changes: { cells: [1, 0, 1, 0, 4], paletteAdded: [] },
        },
      },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Блок' }));
    await user.click(screen.getByRole('button', { name: 'Клик по земле' }));

    expect(await screen.findByText('Срез по высоте: 4')).toBeInTheDocument();
    expect(fetchMock.mock.calls[3][0]).toMatch(/\/chunks$/);
  });

  it('показывает ошибку отмены, не пряча сцену', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
      { status: 400, body: { message: 'Нечего отменять' } },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));

    expect(await screen.findByText('Нечего отменять')).toBeInTheDocument();
    expect(screen.getByText('Сцена, срез Infinity')).toBeInTheDocument();
  });

  it('показывает «Карта не найдена» на 404', async () => {
    stubFetch([
      { status: 404, body: { message: 'Карта не найдена' } },
      { status: 404, body: { message: 'Карта не найдена' } },
    ]);
    renderPage();

    expect(await screen.findByText('Карта не найдена')).toBeInTheDocument();
  });
});
