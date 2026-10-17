import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character, CharacterEffectEntry, Effect } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import EffectsStrip from './EffectsStrip';

const duration = {
  kind: 'time',
  amount: 1,
  unit: 'minute',
  concentration: true,
} as const;

function applied(name: string, inactive = false): CharacterEffectEntry {
  return {
    id: `row-${name}`,
    effect: {
      id: `effect-${name}`,
      name,
      isPublic: true,
      image: null,
      components: [],
      duration,
      saveEnds: null,
    },
    missing: null,
    inactive,
  };
}

const hidden: CharacterEffectEntry = {
  id: 'row-h',
  effect: null,
  missing: 'hidden',
};

const character = (effects: CharacterEffectEntry[]): Character => ({
  ...sampleCharacter,
  effects,
});

function catalogEffect(id: string, name: string, authorId: string): Effect {
  return {
    id,
    name,
    authorId,
    authorNickname: authorId === 'me' ? 'Я' : 'Мастер',
    isPublic: true,
    description: '',
    sources: [],
    image: null,
    components: [],
    duration,
    saveEnds: null,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  };
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EffectsStrip', () => {
  it('зритель видит плашки без крестиков; без эффектов полосы нет', () => {
    const { unmount } = renderWithProviders(
      <EffectsStrip character={character([applied('Ускорение'), hidden])} />,
    );
    expect(screen.getByRole('link', { name: 'Ускорение' })).toHaveAttribute(
      'href',
      '/effects/effect-Ускорение',
    );
    expect(screen.getByText('Эффект скрыт автором')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Снять/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '+ Эффект' })).toBeNull();
    unmount();

    renderWithProviders(<EffectsStrip character={character([])} />);
    expect(screen.queryByLabelText('Наложенные эффекты')).toBeNull();
  });

  it('автор снимает эффект крестиком, без подтверждения', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => json([]));
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderWithProviders(
      <EffectsStrip
        character={character([applied('Ускорение')])}
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Снять «Ускорение»' }),
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/characters\/.+\/effects\/row-Ускорение$/);
    expect(init.method).toBe('DELETE');
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('наложить: уже наложенный выбрать нельзя, ошибка сервера — в окне', async () => {
    const mine = [catalogEffect('effect-Ускорение', 'Ускорение', 'me')];
    const catalog = [catalogEffect('e-bless', 'Благословение', 'gm')];
    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      const url = typeof input === 'string' ? input : '';
      if (init?.method === 'POST') {
        return json({ message: 'Эффект уже наложен', statusCode: 409 }, 409);
      }
      return json(url.includes('scope=mine') ? mine : catalog);
    });
    vi.stubGlobal('fetch', fetchMock);
    // Список вариантов Mantine прокручивает к выбранному, а в jsdom прокрутки нет.
    Element.prototype.scrollIntoView = vi.fn();
    const onChange = vi.fn();
    renderWithProviders(
      <EffectsStrip
        character={character([applied('Ускорение')])}
        onChange={onChange}
      />,
      { auth: { user: { id: 'me', login: 'me', nickname: 'Я' } } },
    );
    await userEvent.click(screen.getByRole('button', { name: '+ Эффект' }));
    const select = await screen.findByRole('combobox', { name: 'Эффект' });
    await screen.findByPlaceholderText('Найти по названию');
    await userEvent.click(select);
    expect(
      await screen.findByRole('option', { name: 'Ускорение · уже наложен' }),
    ).toHaveAttribute('data-combobox-disabled', 'true');
    await userEvent.click(
      screen.getByRole('option', { name: 'Благословение · Мастер' }),
    );
    expect(screen.getByText(/Длительность: /)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Наложить' }));
    expect(await screen.findByText('Эффект уже наложен')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      effectId: 'e-bless',
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
