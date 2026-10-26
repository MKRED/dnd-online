import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character, SpellSlots } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import SpellsSection from './SpellsSection';

const character = (spellSlots: SpellSlots): Character => ({
  ...sampleCharacter,
  spellSlots,
});

const props = (c: Character) => ({
  characterId: c.id,
  abilities: c.abilities,
  spellSlots: c.spellSlots,
});

const slots: SpellSlots = {
  1: { total: 4, expended: 1 },
  2: { total: 2, expended: 0 },
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

// Сервер отвечает персонажем с новыми ячейками; запрос запоминаем для проверки.
function stubPatch(next: SpellSlots, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    status === 200
      ? json(character(next))
      : json({ message: 'Ячеек 1 круга меньше, чем потрачено' }, status),
  );
  vi.stubGlobal('fetch', fetchMock);
  return () => JSON.parse(fetchMock.mock.calls[0][1]!.body as string) as object;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SpellsSection', () => {
  it('без ячеек блока нет', () => {
    renderWithProviders(
      <SpellsSection {...props(character({}))} onSlotsChange={vi.fn()} />,
    );
    expect(screen.queryByText('Заклинания')).toBeNull();
  });

  it('зритель видит кружки без кнопок и без «Долгого отдыха»', () => {
    renderWithProviders(<SpellsSection {...props(character(slots))} />);
    expect(
      screen.getByRole('group', {
        name: 'Ячейки 1 круга: осталось 3 из 4',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('клик по полному кружку тратит ячейку, по пустому — возвращает', async () => {
    const onChange = vi.fn();
    const next = { ...slots, 1: { total: 4, expended: 2 } };
    const sent = stubPatch(next);
    renderWithProviders(
      <SpellsSection {...props(character(slots))} onSlotsChange={onChange} />,
    );
    const first = screen.getByRole('group', { name: /1 круга/ });
    expect(
      within(first).getAllByRole('button', {
        name: 'Потратить ячейку 1 круга',
      }),
    ).toHaveLength(3);
    await userEvent.click(
      within(first).getAllByRole('button', { name: /Потратить/ })[0],
    );
    expect(sent()).toEqual({ spellSlotsExpended: { 1: 2 } });
    expect(onChange).toHaveBeenCalledWith(next);
  });

  it('возврат ячейки шлёт на одну меньше', async () => {
    const sent = stubPatch({ ...slots, 1: { total: 4, expended: 0 } });
    renderWithProviders(
      <SpellsSection {...props(character(slots))} onSlotsChange={vi.fn()} />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Вернуть ячейку 1 круга' }),
    );
    expect(sent()).toEqual({ spellSlotsExpended: { 1: 0 } });
  });

  it('«Долгий отдых» в заголовке возвращает все круги; когда тратить нечего, он не нажимается', async () => {
    const onChange = vi.fn();
    const sent = stubPatch({ ...slots, 1: { total: 4, expended: 0 } });
    renderWithProviders(
      <SpellsSection {...props(character(slots))} onSlotsChange={onChange} />,
    );
    const legend = screen.getByRole('group', { name: /Заклинания/ });
    await userEvent.click(
      within(legend).getByRole('button', { name: 'Долгий отдых' }),
    );
    expect(sent()).toEqual({ spellSlotsExpended: { 1: 0, 2: 0 } });
  });

  it('«Долгий отдых» не нажимается, когда все ячейки целы', () => {
    renderWithProviders(
      <SpellsSection
        {...props(character({ 2: { total: 2, expended: 0 } }))}
        onSlotsChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Долгий отдых' })).toBeDisabled();
  });

  it('без права тратить кнопки «Долгий отдых» нет', () => {
    renderWithProviders(<SpellsSection {...props(character(slots))} />);
    expect(screen.queryByRole('button', { name: 'Долгий отдых' })).toBeNull();
    expect(screen.getByText('Заклинания')).toBeInTheDocument();
  });

  it('ошибка сервера показывается, лист не меняется', async () => {
    const onChange = vi.fn();
    stubPatch({}, 400);
    renderWithProviders(
      <SpellsSection {...props(character(slots))} onSlotsChange={onChange} />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Вернуть ячейку 1 круга' }),
    );
    expect(
      await screen.findByText('Ячеек 1 круга меньше, чем потрачено'),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
