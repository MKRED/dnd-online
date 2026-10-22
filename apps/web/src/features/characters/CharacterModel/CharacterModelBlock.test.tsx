import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterModel } from 'shared';
import { renderWithProviders } from '../../../test/render';
import CharacterModelBlock from './CharacterModelBlock';

// В jsdom нет WebGL — вместо сцены заглушка.
vi.mock('./ModelPreview', () => ({ default: () => <div>Предпросмотр</div> }));

const stlModel: CharacterModel = {
  format: 'stl',
  size: 2.5 * 1024 * 1024,
  version: 1,
  color: '#9a948a',
  fit: { scale: 1, turn: 0, up: 'z' },
  updatedAt: '2026-10-22T00:00:00.000Z',
};

function stubFetch(model: CharacterModel | null) {
  const fetchMock = vi.fn<typeof fetch>((_url, init) =>
    Promise.resolve(
      init?.method === 'PATCH'
        ? new Response(
            JSON.stringify({
              ...model,
              ...JSON.parse(init.body as string),
            }),
          )
        : init?.method === 'DELETE'
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify({ model })),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('CharacterModelBlock', () => {
  it('без модели предлагает загрузить .glb или STL', async () => {
    stubFetch(null);
    renderWithProviders(<CharacterModelBlock characterId="c1" />);
    expect(
      await screen.findByRole('button', { name: 'Загрузить модель' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/с цветами и текстурами/)).toBeInTheDocument();
  });

  it('у STL — цвет, размер файла и поправка; поворот сохраняется с паузой', async () => {
    const fetchMock = stubFetch(stlModel);
    renderWithProviders(<CharacterModelBlock characterId="c1" />);
    expect(await screen.findByText('STL · 2,5 МБ')).toBeInTheDocument();
    expect(screen.getByLabelText('Цвет фигурки')).toHaveValue('#9a948a');
    expect(await screen.findByText('Предпросмотр')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Повернуть модель вправо' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Повернуть модель вправо' }),
    );
    // Два поворота — один запрос после паузы, с итоговой поправкой.
    await waitFor(
      () =>
        expect(
          fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH'),
        ).toHaveLength(1),
      { timeout: 2000 },
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({
      fit: { scale: 1, turn: 2, up: 'z' },
    });
  });

  it('удаление спрашивает и возвращает приглашение загрузить', async () => {
    stubFetch(stlModel);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CharacterModelBlock characterId="c1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Удалить' }),
    );
    expect(confirm).toHaveBeenCalled();
    await act(async () => {});
    expect(
      await screen.findByRole('button', { name: 'Загрузить модель' }),
    ).toBeInTheDocument();
  });
});
