import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import HitPointsControls from './HitPointsControls';

// Блок хитов: строки «число + тип» (вариант 1, 2026-10-26).
function setup() {
  const onChange = vi.fn();
  renderWithProviders(
    <HitPointsControls
      current={54}
      max={65}
      temp={0}
      busy={false}
      onChange={onChange}
    />,
  );
  return onChange;
}

async function pickType(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('HitPointsControls', () => {
  it('поле числа без стрелок; стрелки клавиатуры меняют число', async () => {
    const onChange = setup();
    const amount = screen.getByLabelText('Сколько хитов');
    // Стрелки Mantine скрыты от чтения с экрана, поэтому ищем их по классу.
    expect(document.querySelector('.mantine-NumberInput-control')).toBeNull();
    await userEvent.type(amount, '3{ArrowUp}{ArrowUp}');
    await userEvent.click(screen.getByRole('button', { name: 'Лечение' }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'heal', amount: 5 });
  });

  it('смешанный урон — частями с типами; типы остаются до следующего удара', async () => {
    const onChange = setup();
    await userEvent.type(screen.getByLabelText('Сколько хитов'), '6');
    await pickType('Тип урона', 'Колющий');
    await userEvent.click(screen.getByRole('button', { name: 'ещё тип' }));
    await userEvent.type(screen.getByLabelText('Сколько хитов, часть 2'), '4');
    await pickType('Тип урона, часть 2', 'Некротический');
    expect(screen.getByText('10')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Урон' }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'damage',
      amount: 10,
      parts: [
        { amount: 6, type: 'piercing' },
        { amount: 4, type: 'necrotic' },
      ],
    });
    // Числа стёрты, типы на месте: следующий удар — только числа.
    expect(screen.getByLabelText('Сколько хитов')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Тип урона' })).toHaveValue(
      'Колющий',
    );
    expect(screen.getByRole('button', { name: 'Урон' })).toBeDisabled();
  });

  it('лечение берёт сумму строк; Enter — урон без типа; лишняя строка убирается', async () => {
    const onChange = setup();
    await userEvent.type(screen.getByLabelText('Сколько хитов'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'ещё тип' }));
    await userEvent.type(screen.getByLabelText('Сколько хитов, часть 2'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Лечение' }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'heal', amount: 5 });

    await userEvent.click(
      screen.getByRole('button', { name: 'Убрать часть 2' }),
    );
    expect(screen.queryByLabelText('Сколько хитов, часть 2')).toBeNull();
    await userEvent.type(screen.getByLabelText('Сколько хитов'), '7{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'damage',
      amount: 7,
      parts: [{ amount: 7, type: null }],
    });
  });

  it('строк урона — не больше пяти', async () => {
    setup();
    const more = screen.getByRole('button', { name: 'ещё тип' });
    for (let i = 0; i < 4; i++) await userEvent.click(more);
    expect(more).toBeDisabled();
  });
});
