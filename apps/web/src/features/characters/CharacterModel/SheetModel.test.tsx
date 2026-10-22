import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterModel } from 'shared';
import { renderWithProviders } from '../../../test/render';
import SheetModel from './SheetModel';

// В jsdom нет WebGL — вместо сцены заглушка.
vi.mock('./ModelPreview', () => ({ default: () => <div>Предпросмотр</div> }));

const glbModel: CharacterModel = {
  format: 'glb',
  size: 1024,
  version: 2,
  color: null,
  fit: { scale: 1, turn: 0, up: 'y' },
  updatedAt: '2026-10-22T00:00:00.000Z',
};

function stubModel(model: CharacterModel | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ model }))),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SheetModel', () => {
  it('с моделью показывает предпросмотр', async () => {
    stubModel(glbModel);
    renderWithProviders(<SheetModel characterId="c1" />);
    expect(await screen.findByText('Предпросмотр')).toBeInTheDocument();
  });

  it('без модели ничего не показывает', async () => {
    stubModel(null);
    renderWithProviders(<SheetModel characterId="c1" />);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByText('Предпросмотр')).not.toBeInTheDocument();
  });
});
