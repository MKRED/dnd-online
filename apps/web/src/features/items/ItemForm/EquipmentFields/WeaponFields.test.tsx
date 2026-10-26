import { useForm } from '@mantine/form';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import { toFormValues, type ItemFormValues } from '../itemFormValues';
import { weaponFromBook } from './weaponFormValues';
import WeaponFields from './WeaponFields';

function Harness({ weapon }: { weapon: ItemFormValues['weapon'] }) {
  const form = useForm<ItemFormValues>({
    initialValues: { ...toFormValues(null), category: 'weapon', weapon },
  });
  return <WeaponFields form={form} />;
}

describe('WeaponFields', () => {
  it('дополнительный урон: не больше двух строк, строку можно убрать', async () => {
    const u = userEvent.setup();
    renderWithProviders(<Harness weapon={weaponFromBook('longsword')} />);
    const add = () =>
      screen.queryByRole('button', { name: 'Дополнительный урон' });

    await u.click(add()!);
    await u.click(add()!);
    expect(add()).toBeNull();
    expect(
      screen.getByRole('textbox', {
        name: 'Дополнительный урон 2: количество',
      }),
    ).toBeInTheDocument();

    await u.click(
      screen.getByRole('button', { name: 'Убрать дополнительный урон 1' }),
    );
    expect(
      screen.queryByRole('textbox', {
        name: 'Дополнительный урон 2: количество',
      }),
    ).toBeNull();
    expect(add()).toBeInTheDocument();
  });

  it('свойства только своего вида атаки', async () => {
    const u = userEvent.setup();
    renderWithProviders(<Harness weapon={weaponFromBook('longsword')} />);
    expect(
      screen.getByRole('checkbox', { name: 'Универсальное' }),
    ).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Боеприпас' })).toBeNull();

    await u.click(screen.getByText('Дальнобойное'));
    expect(
      screen.getByRole('checkbox', { name: 'Боеприпас' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Универсальное' }),
    ).toBeNull();
    expect(screen.queryByText('Двумя руками')).toBeNull();
  });
});
