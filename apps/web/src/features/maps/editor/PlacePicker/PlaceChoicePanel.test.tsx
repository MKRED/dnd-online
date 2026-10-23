import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BASE_BLOCKS,
  createBlockCatalog,
  type BlockCatalog,
  type BlockGroupInfo,
} from 'shared';
import { renderWithProviders } from '../../../../test/render';
import PlaceChoicePanel from './PlaceChoicePanel';
import type { ObjectChoice, RecentPlace } from './placeChoice';

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

const blocks = (...names: string[]): RecentPlace[] =>
  names.map((name) => ({ type: 'block', name }));

function Harness({
  onPickBlock = vi.fn(),
  onPickObject = vi.fn(),
  onSelectRecent = vi.fn(),
  catalog = BASE_BLOCKS,
  block = 'stone_stairs',
  choice = null,
  recent = blocks('wood', 'stone_stairs'),
  blocksOnly = true,
}: {
  onPickBlock?: (block: string) => void;
  onPickObject?: (choice: ObjectChoice) => void;
  onSelectRecent?: (recent: RecentPlace) => void;
  catalog?: BlockCatalog;
  block?: string;
  choice?: ObjectChoice | null;
  recent?: RecentPlace[];
  blocksOnly?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <PlaceChoicePanel
      catalog={catalog}
      block={block}
      rotation={0}
      choice={choice}
      recent={recent}
      blocksOnly={blocksOnly}
      opened={opened}
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
      onPickBlock={onPickBlock}
      onPickObject={onPickObject}
      onSelectRecent={onSelectRecent}
    />
  );
}

describe('выбор блока (заливка, коробка, замена)', () => {
  it('недавние в панели выбирают блок одним кликом', () => {
    const onSelectRecent = vi.fn();
    renderWithProviders(<Harness onSelectRecent={onSelectRecent} />);
    fireEvent.click(screen.getByRole('button', { name: 'Дерево' }));
    expect(onSelectRecent).toHaveBeenCalledWith({
      type: 'block',
      name: 'wood',
    });
  });

  it('материал, потом форма: выбор закрывает окно', () => {
    const onPickBlock = vi.fn();
    renderWithProviders(<Harness onPickBlock={onPickBlock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const dialog = screen.getByRole('dialog', { name: 'Выбор блока' });
    // Окно открывается с материала текущего блока — камня.
    expect(dialog).toHaveTextContent('Форма — Камень');
    fireEvent.click(screen.getByRole('button', { name: 'Кирпич' }));
    expect(dialog).toHaveTextContent('Форма — Кирпич');
    fireEvent.click(screen.getByRole('button', { name: 'Плита' }));
    expect(onPickBlock).toHaveBeenCalledWith('brick_slab');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('двойной клик по материалу берёт его в текущей форме', () => {
    const onPickBlock = vi.fn();
    renderWithProviders(<Harness onPickBlock={onPickBlock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Песок' }));
    expect(onPickBlock).toHaveBeenCalledWith('sand_stairs');
  });

  it('поиск: Enter берёт первый найденный', () => {
    const onPickBlock = vi.fn();
    renderWithProviders(<Harness onPickBlock={onPickBlock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const search = screen.getByRole('textbox', { name: 'Поиск' });
    fireEvent.change(search, { target: { value: 'лава плит' } });
    expect(
      screen.getByRole('button', { name: 'Лава: плита' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onPickBlock).toHaveBeenCalledWith('lava_slab');
  });

  it('ничего не нашлось — так и пишет', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск' }), {
      target: { value: 'мрамор' },
    });
    expect(screen.getByText('Ничего не нашлось.')).toBeInTheDocument();
  });

  it('свои блоки: группа в «Мои блоки», её формы, двойной клик в текущей форме', () => {
    const onPickBlock = vi.fn();
    renderWithProviders(
      <Harness
        onPickBlock={onPickBlock}
        catalog={createBlockCatalog([embers])}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const dialog = screen.getByRole('dialog', { name: 'Выбор блока' });
    expect(dialog).toHaveTextContent('Мои блоки');
    fireEvent.click(screen.getByRole('button', { name: 'Тлеющие угли' }));
    expect(dialog).toHaveTextContent('Форма — Тлеющие угли');
    expect(dialog).toHaveTextContent('Опасный');
    fireEvent.click(screen.getByRole('button', { name: 'Ступени' }));
    expect(onPickBlock).toHaveBeenCalledWith(`${EMBERS_ID}_stairs`);
  });

  it('двойной клик по своей группе и поиск по своим блокам', () => {
    const onPickBlock = vi.fn();
    renderWithProviders(
      <Harness
        onPickBlock={onPickBlock}
        catalog={createBlockCatalog([embers])}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Тлеющие угли' }));
    expect(onPickBlock).toHaveBeenLastCalledWith(`${EMBERS_ID}_stairs`);

    fireEvent.click(screen.getByRole('button', { name: 'Выбрать блок' }));
    const search = screen.getByRole('textbox', { name: 'Поиск' });
    fireEvent.change(search, { target: { value: 'угли плит' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onPickBlock).toHaveBeenLastCalledWith(`${EMBERS_ID}_slab`);
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
        recent={blocks(EMBERS_ID, OTHER_ID, 'wood')}
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

describe('окно «Что поставить» (этап 10)', () => {
  const TABLE = '00000000-0000-4000-8000-0000000000a1';

  afterEach(() => vi.unstubAllGlobals());

  it('вкладки по ролям: контейнер и старт ставятся без каталога', () => {
    const onPickObject = vi.fn();
    renderWithProviders(
      <Harness blocksOnly={false} onPickObject={onPickObject} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Выбрать, что ставить' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Что поставить' });
    // Открывается на вкладке текущего выбора — блоков.
    expect(dialog).toHaveTextContent('Форма — Камень');
    fireEvent.click(screen.getByRole('tab', { name: 'Контейнеры' }));
    fireEvent.click(screen.getByRole('button', { name: 'Бочка' }));
    expect(onPickObject).toHaveBeenCalledWith({
      kind: 'container',
      look: 'barrel',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('обстановка — своя из каталога карты, с размером модели', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify([
              { id: TABLE, name: 'Стол', modelSize: [2, 1, 1], mount: 'floor' },
            ]),
          ),
        ),
      ),
    );
    const onPickObject = vi.fn();
    renderWithProviders(
      <Harness blocksOnly={false} onPickObject={onPickObject} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Выбрать, что ставить' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Обстановка' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Стол · 2×1×1 · на полу' }),
    );
    expect(onPickObject).toHaveBeenCalledWith({
      kind: 'furniture',
      entry: expect.objectContaining({
        kind: 'furniture',
        id: TABLE,
        modelSize: [2, 1, 1],
      }) as unknown,
    });
  });

  it('общий поиск: блоки и объекты вместе, Enter берёт первое', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('[]'))),
    );
    const onPickObject = vi.fn();
    renderWithProviders(
      <Harness blocksOnly={false} onPickObject={onPickObject} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Выбрать, что ставить' }),
    );
    const search = screen.getByRole('textbox', { name: 'Поиск' });
    fireEvent.change(search, { target: { value: 'сунд' } });
    expect(screen.getByRole('button', { name: 'Сундук' })).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onPickObject).toHaveBeenCalledWith({
      kind: 'container',
      look: 'chest',
    });
  });

  it('панель: текущий объект и недавние вперемешку', () => {
    const onSelectRecent = vi.fn();
    const chest: ObjectChoice = { kind: 'container', look: 'chest' };
    renderWithProviders(
      <Harness
        blocksOnly={false}
        choice={chest}
        recent={[
          { type: 'object', choice: chest },
          { type: 'block', name: 'wood' },
          { type: 'object', choice: { kind: 'start' } },
        ]}
        onSelectRecent={onSelectRecent}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Выбрать, что ставить' }),
    ).toHaveTextContent('Сундук');
    fireEvent.click(screen.getByRole('button', { name: 'Точка старта' }));
    expect(onSelectRecent).toHaveBeenCalledWith({
      type: 'object',
      choice: { kind: 'start' },
    });
  });
});
