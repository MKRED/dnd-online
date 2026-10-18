import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import { ABILITIES, EFFECTS } from '../simpleCatalogs';
import { SimpleCreatePage } from '../SimpleFormPage';

describe('гайд по форме способности', () => {
  it('открывается поверх формы и, закрывшись, оставляет введённое', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SimpleCreatePage def={ABILITIES} />);
    await user.type(screen.getByLabelText(/Название/), 'Ледяной кинжал');

    await user.click(
      screen.getByRole('button', { name: 'Как заполнить способность' }),
    );
    const guide = screen.getByRole('dialog');
    expect(guide).toHaveTextContent('Применение: шаги');
    // Карточка примера — настоящими строками карточки.
    await user.click(screen.getByRole('button', { name: /Огненный шар/ }));
    expect(guide).toHaveTextContent(
      'Рост за каждый круг ячейки выше 3: +1d6 Огонь',
    );

    await user.click(screen.getByRole('button', { name: 'Закрыть гайд' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText(/Название/)).toHaveValue('Ледяной кинжал');
  });

  it('у эффектов кнопки нет', () => {
    renderWithProviders(<SimpleCreatePage def={EFFECTS} />);
    expect(screen.queryByRole('button', { name: /Как заполнить/ })).toBeNull();
  });
});
