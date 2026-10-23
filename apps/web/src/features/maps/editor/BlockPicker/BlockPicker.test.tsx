import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  BASE_BLOCKS,
  createBlockCatalog,
  type BlockCatalog,
  type BlockGroupInfo,
} from 'shared';
import { renderWithProviders } from '../../../../test/render';
import BlockPicker from './BlockPicker';

const EMBERS_ID = '0b5c6f2e-8a1d-4c3b-9e7f-1a2b3c4d5e6f';
const OTHER_ID = '11111111-2222-4333-8444-555555555555';

const embers: BlockGroupInfo = {
  id: EMBERS_ID,
  name: 'Тлеющие угли',
  look: 'scorched',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
  shapes: {},
};

function Harness({
  onPick = vi.fn(),
  onSelect = vi.fn(),
  catalog = BASE_BLOCKS,
  block = 'stone_stairs',
  recent = ['wood', 'stone_stairs'],
}: {
  onPick?: (block: string) => void;
  onSelect?: (block: string) => void;
  catalog?: BlockCatalog;
  block?: string;
  recent?: string[];
}) {
  const [opened, setOpened] = useState(false);
  return (
    <BlockPicker
      catalog={catalog}
      block={block}
      rotation={0}
      recent={recent}
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

  it('свои блоки: группа в «Мои блоки», её формы, двойной клик в текущей форме', () => {
    const onPick = vi.fn();
    renderWithProviders(
      <Harness onPick={onPick} catalog={createBlockCatalog([embers])} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const dialog = screen.getByRole('dialog', { name: 'Выбор блока' });
    expect(dialog).toHaveTextContent('Мои блоки');
    fireEvent.click(screen.getByRole('button', { name: 'Тлеющие угли' }));
    expect(dialog).toHaveTextContent('Форма — Тлеющие угли');
    expect(dialog).toHaveTextContent('Опасный');
    fireEvent.click(screen.getByRole('button', { name: 'Ступени' }));
    expect(onPick).toHaveBeenCalledWith(`${EMBERS_ID}_stairs`);
  });

  it('двойной клик по своей группе и поиск по своим блокам', () => {
    const onPick = vi.fn();
    renderWithProviders(
      <Harness onPick={onPick} catalog={createBlockCatalog([embers])} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Тлеющие угли' }));
    expect(onPick).toHaveBeenLastCalledWith(`${EMBERS_ID}_stairs`);

    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const search = screen.getByRole('textbox', { name: 'Поиск блока' });
    fireEvent.change(search, { target: { value: 'угли плит' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onPick).toHaveBeenLastCalledWith(`${EMBERS_ID}_slab`);
  });

  it('своих нет — ссылка на создание блока', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    expect(screen.getByText(/Своих блоков пока нет/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Создать в справочнике' }),
    ).toHaveAttribute('href', '/blocks/new');
  });

  it('свой блок — с подписью группы, чужого нет в недавних', () => {
    renderWithProviders(
      <Harness
        catalog={createBlockCatalog([embers])}
        block={EMBERS_ID}
        recent={[EMBERS_ID, OTHER_ID, 'wood']}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Выбрать блок' }),
    ).toHaveTextContent('Тлеющие угли');
    expect(
      screen.getByRole('button', { name: 'Тлеющие угли' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /./ })).toHaveLength(3);
  });
});
