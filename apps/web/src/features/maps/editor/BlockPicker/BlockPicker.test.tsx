import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import BlockPicker from './BlockPicker';

function Harness({
  onPick = vi.fn(),
  onSelect = vi.fn(),
}: {
  onPick?: (block: string) => void;
  onSelect?: (block: string) => void;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <BlockPicker
      block="stone_stairs"
      rotation={0}
      recent={['wood', 'stone_stairs']}
      opened={opened}
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
      onPick={onPick}
      onSelect={onSelect}
    />
  );
}

describe('BlockPicker', () => {
  it('недавние в панели выбирают блок одним кликом', () => {
    const onSelect = vi.fn();
    renderWithProviders(<Harness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Дерево' }));
    expect(onSelect).toHaveBeenCalledWith('wood');
  });

  it('материал, потом форма: выбор закрывает окно', () => {
    const onPick = vi.fn();
    renderWithProviders(<Harness onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const dialog = screen.getByRole('dialog', { name: 'Выбор блока' });
    // Окно открывается с материала текущего блока — камня.
    expect(dialog).toHaveTextContent('Форма — Камень');
    fireEvent.click(screen.getByRole('button', { name: 'Кирпич' }));
    expect(dialog).toHaveTextContent('Форма — Кирпич');
    fireEvent.click(screen.getByRole('button', { name: 'Плита' }));
    expect(onPick).toHaveBeenCalledWith('brick_slab');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('двойной клик по материалу берёт его в текущей форме', () => {
    const onPick = vi.fn();
    renderWithProviders(<Harness onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Песок' }));
    expect(onPick).toHaveBeenCalledWith('sand_stairs');
  });

  it('поиск: Enter берёт первый найденный', () => {
    const onPick = vi.fn();
    renderWithProviders(<Harness onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const search = screen.getByRole('textbox', { name: 'Поиск блока' });
    fireEvent.change(search, { target: { value: 'лава плит' } });
    expect(
      screen.getByRole('button', { name: 'Лава: плита' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('lava_slab');
  });

  it('ничего не нашлось — так и пишет', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск блока' }), {
      target: { value: 'мрамор' },
    });
    expect(screen.getByText('Ничего не нашлось.')).toBeInTheDocument();
  });
});
