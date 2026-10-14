import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../test/characterFixture';
import { renderWithProviders } from '../../test/render';
import ShareDialog from './ShareDialog';

function renderDialog(onChanged = vi.fn()) {
  renderWithProviders(
    <ShareDialog
      character={sampleCharacter}
      opened
      onClose={vi.fn()}
      onChanged={onChanged}
    />,
  );
  return onChanged;
}

describe('ShareDialog', () => {
  it('сразу сохраняет доступ по ссылке', async () => {
    const shared = { ...sampleCharacter, linkAccess: 'link' };
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify(shared))),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChanged = renderDialog();

    expect(
      screen.getByRole('textbox', { name: 'Ссылка на персонажа' }),
    ).toHaveValue(`${window.location.origin}/characters/${sampleCharacter.id}`);
    await userEvent
      .setup()
      .click(screen.getByRole('radio', { name: /Все, у кого есть ссылка/ }));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledWith(shared));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(
      new RegExp(`/characters/${sampleCharacter.id}/access$`),
    );
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ linkAccess: 'link' });
  });

  it('показывает ошибку, если доступ не изменился', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Персонаж не найден' }), {
            status: 404,
          }),
        ),
      ),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onChanged = renderDialog();

    await userEvent
      .setup()
      .click(screen.getByRole('radio', { name: /Все, у кого есть ссылка/ }));

    expect(await screen.findByText('Персонаж не найден')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: /Только я/ })).toBeChecked();
  });
});
