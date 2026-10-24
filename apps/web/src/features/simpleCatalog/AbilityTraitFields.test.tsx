import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { ABILITIES } from './simpleCatalogs';
import { SimpleCreatePage } from './SimpleFormPage';

type User = ReturnType<typeof userEvent.setup>;

// Выбрать вариант в Select Mantine: открыть список и щёлкнуть пункт.
async function pick(user: User, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

const options = async (user: User, label: string) => {
  await user.click(screen.getByRole('combobox', { name: label }));
  const list = await screen.findByRole('listbox');
  const names = within(list)
    .getAllByRole('option')
    .map((o) => o.textContent);
  await user.keyboard('{Escape}');
  return names;
};

// docs/plan/done/traits.md: черта у «Базовой» с блоком «Действует всегда».
describe('черта в форме способности', () => {
  it('у базовой есть «Черта» и блок составляющих; у заклинания — нет', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SimpleCreatePage def={ABILITIES} />);
    expect(screen.queryByText('Действует всегда')).toBeNull();

    await pick(user, 'Активация', 'Черта');
    expect(screen.getByText('Действует всегда')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '+ Составляющая' }),
    ).toBeInTheDocument();

    // Заклинанием черта не бывает: активация сменилась действием, блок ушёл.
    await pick(user, 'Категория', 'Заклинание');
    expect(screen.getByRole('combobox', { name: 'Активация' })).toHaveValue(
      'Действие',
    );
    expect(screen.queryByText('Действует всегда')).toBeNull();
    expect(await options(user, 'Активация')).not.toContain('Черта');
  });
});
