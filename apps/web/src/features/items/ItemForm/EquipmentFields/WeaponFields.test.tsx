import { useForm } from '@mantine/form';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import { toFormValues, type ItemFormValues } from '../itemFormValues';
import { weaponFromBook } from './weaponFormValues';
import WeaponFields from './WeaponFields';

function Harness({
  weapon,
  attunement = false,
}: {
  weapon: ItemFormValues['weapon'];
  attunement?: boolean;
}) {
  const form = useForm<ItemFormValues>({
    initialValues: {
      ...toFormValues(null),
      category: 'weapon',
      rarity: 'rare',
      weapon,
      attunement,
    },
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

  // Вариант 1А макета 2026-10-27: отметка у каждой строки доп. урона, только с настройкой.
  it('«Действует без настройки» у строк доп. урона — только у предмета с настройкой', async () => {
    const u = userEvent.setup();
    const fire = {
      count: 2,
      die: '6',
      type: 'fire',
      withoutAttunement: false,
    } as const;
    const weapon = { ...weaponFromBook('longsword'), extraDamage: [fire] };
    const { unmount } = renderWithProviders(<Harness weapon={weapon} />);
    expect(
      screen.queryByRole('checkbox', { name: /действует без настройки/ }),
    ).toBeNull();
    unmount();
    renderWithProviders(<Harness weapon={weapon} attunement />);
    const mark = screen.getByRole('checkbox', {
      name: 'Дополнительный урон 1: действует без настройки',
    });
    expect(mark).not.toBeChecked();
    await u.click(mark);
    expect(mark).toBeChecked();
  });
});
