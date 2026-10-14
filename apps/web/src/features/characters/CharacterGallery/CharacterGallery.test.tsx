import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CharacterImage } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import CharacterGallery from './CharacterGallery';

const CHARACTER_ID = 'c0000000-0000-4000-8000-000000000001';

function image(overrides: Partial<CharacterImage>): CharacterImage {
  return {
    id: 'i0000000-0000-4000-8000-000000000001',
    characterId: CHARACTER_ID,
    position: 0,
    isMain: false,
    width: 800,
    height: 600,
    thumbCrop: { x: 100, y: 0, size: 600 },
    thumbVersion: 1,
    createdAt: '2026-10-14T00:00:00.000Z',
    ...overrides,
  };
}

const first = image({ isMain: true });
const second = image({
  id: 'i0000000-0000-4000-8000-000000000002',
  position: 1,
});

interface Call {
  method: string;
  path: string;
  body: unknown;
}

// Сеть подменяем по адресу, а не по порядку вызовов: байты картинок плитки запрашивают
// сами и в произвольном порядке. Ответ на правку задаёт тест.
function stubApi(
  gallery: CharacterImage[][],
  respond: (call: Call) => Response | undefined = () => undefined,
) {
  const calls: Call[] = [];
  let listed = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((input, init) => {
      // Код галереи вызывает fetch только со строковым адресом.
      const path = (input as string).replace(/^.*\/images/, '');
      const call = { method: init?.method ?? 'GET', path, body: init?.body };
      calls.push(call);
      if (path.includes('/file')) {
        return Promise.resolve(new Response(new Blob(['webp'])));
      }
      const custom = respond(call);
      if (custom) return Promise.resolve(custom);
      // Каждое чтение списка отдаёт следующее состояние галереи, последнее — повторяется.
      const state = gallery[Math.min(listed, gallery.length - 1)];
      if (call.method === 'GET') listed += 1;
      return Promise.resolve(new Response(JSON.stringify(state)));
    }),
  );
  return calls;
}

function renderGallery() {
  return renderWithProviders(
    <CharacterGallery characterId={CHARACTER_ID} characterName="Арагорн" />,
  );
}

describe('CharacterGallery', () => {
  beforeEach(() => {
    // В jsdom нет object URL — подставляем адрес, по которому видно, что картинка «загружена».
    let counter = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => `blob:test/${(counter += 1)}`,
      revokeObjectURL: vi.fn(),
    });
  });

  it('показывает картинки и отмечает основную', async () => {
    stubApi([[first, second]]);
    renderGallery();

    const tiles = await screen.findAllByTestId('gallery-tile');
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveTextContent('Основная');
    expect(tiles[1]).not.toHaveTextContent('Основная');
    // Байты пришли через fetch и показаны как object URL.
    await waitFor(() =>
      expect(tiles[1].querySelector('img')).toHaveAttribute(
        'src',
        expect.stringMatching(/^blob:test\//),
      ),
    );
  });

  it('в пустой галерее предлагает добавить картинки', async () => {
    stubApi([[]]);
    renderGallery();

    expect(
      await screen.findByText('Перетащите картинки сюда или нажмите'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Изменить миниатюру' }),
    ).not.toBeInTheDocument();
  });

  it('назначает основную и перечитывает галерею', async () => {
    const calls = stubApi([
      [first, second],
      [
        { ...first, isMain: false },
        { ...second, isMain: true },
      ],
    ]);
    renderGallery();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Действия с картинкой 2' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Сделать основной' }),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId('gallery-tile')[1]).toHaveTextContent(
        'Основная',
      ),
    );
    const patch = calls.find((call) => call.method === 'PATCH');
    expect(patch?.path).toBe(`/${second.id}`);
    expect(JSON.parse(patch?.body as string)).toEqual({ isMain: true });
  });

  it('показывает причину, по которой сервер не принял файл', async () => {
    stubApi([[first]], (call) =>
      call.method === 'POST'
        ? new Response(
            JSON.stringify({ message: 'Не удалось прочитать картинку' }),
            { status: 400 },
          )
        : undefined,
    );
    renderGallery();
    await screen.findAllByTestId('gallery-tile');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    await userEvent.upload(
      input!,
      new File(['x'], 'портрет.png', { type: 'image/png' }),
    );

    expect(
      await screen.findByText('портрет.png: Не удалось прочитать картинку'),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('gallery-tile')).toHaveLength(1);
  });

  it('не удаляет картинку без подтверждения', async () => {
    const calls = stubApi([[first, second]]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderGallery();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Действия с картинкой 2' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }));

    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
  });
});
