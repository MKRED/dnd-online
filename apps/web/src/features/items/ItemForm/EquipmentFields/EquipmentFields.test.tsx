import { useForm } from '@mantine/form';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import { toFormValues, type ItemFormValues } from '../itemFormValues';
import EquipmentFields from './EquipmentFields';

function Harness({ magicBonus }: { magicBonus: string }) {
  const form = useForm<ItemFormValues>({
    initialValues: {
      ...toFormValues(null),
      category: 'shield',
      rarity: 'rare',
      magicBonus,
    },
  });
  return <EquipmentFields form={form} />;
}

const mark = () =>
  screen.queryByRole('checkbox', { name: 'Действует без настройки' });

// Вариант 1А макета 2026-10-27: отметка у бонуса — когда он есть и нужна настройка.
describe('EquipmentFields: бонус без настройки', () => {
  it('отметка появляется с «Требует настройки» и бонусом', async () => {
    const u = userEvent.setup();
    renderWithProviders(<Harness magicBonus="1" />);
    expect(mark()).toBeNull();
    await u.click(screen.getByRole('checkbox', { name: /Требует настройки/ }));
    expect(mark()).toBeInTheDocument();
  });

  it('без бонуса отметки нет', async () => {
    const u = userEvent.setup();
    renderWithProviders(<Harness magicBonus="0" />);
    await u.click(screen.getByRole('checkbox', { name: /Требует настройки/ }));
    expect(mark()).toBeNull();
  });
});
