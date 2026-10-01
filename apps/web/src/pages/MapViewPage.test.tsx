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
import { renderWithProviders } from '../test/render';
import MapViewPage from './MapViewPage';

// В jsdom нет WebGL — вместо настоящей сцены заглушка, показывающая, что ей передали.
vi.mock('../features/maps/MapScene', () => ({
  default: ({ cutY }: { cutY: number }) => <p>Сцена, срез {String(cutY)}</p>,
}));

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
  it('показывает сцену со срезом по верхнему уровню карты', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();

    expect(await screen.findByText('Сцена, срез 4')).toBeInTheDocument();
    expect(screen.getByText('Подземелье')).toBeInTheDocument();
  });

  it('на пустой карте строит демо-деревню и перезагружает карту', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: info },
      { status: 200, body: emptyChunks },
      { status: 200, body: { seq: 1, changedCells: 10, conflicts: 0 } },
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Построить демо-деревню' }),
    );

    expect(await screen.findByText(/Сцена, срез/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toMatch(new RegExp(`/maps/${MAP_ID}/ops$`));
    expect(init?.method).toBe('POST');
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
