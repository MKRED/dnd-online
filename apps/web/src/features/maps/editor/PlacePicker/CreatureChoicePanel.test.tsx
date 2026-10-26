import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import CreatureChoicePanel from './CreatureChoicePanel';
import PlacePickerModal from './PlacePickerModal';
import type { ObjectChoice } from './placeChoice';

const RAT = '00000000-0000-4000-8000-000000000001';
const KING = '00000000-0000-4000-8000-000000000002';
const SERA = '00000000-0000-4000-8000-000000000003';

// Сервер каталога: обычная крыса и уникальный король среди монстров, Серафина среди НПС.
function stubCatalog() {
  const fetchMock = vi.fn((url: string) => {
    const body = url.includes('kind=monster')
      ? [
          { id: RAT, name: 'Крыса', size: 'tiny', image: null },
          {
            id: KING,
            name: 'Крысиный Король',
            size: 'large',
            role: 'unique',
            image: null,
          },
        ]
      : url.includes('kind=npc')
        ? [{ id: SERA, name: 'Серафина', mainImage: null }]
        : [];
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function Harness({ onPick }: { onPick: (choice: ObjectChoice) => void }) {
  const [opened, setOpened] = useState(false);
  return (
    <CreatureChoicePanel
      choice={null}
      recent={[]}
      opened={opened}
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
      onPick={onPick}
      onSelectRecent={vi.fn()}
      onClear={vi.fn()}
    />
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('CreatureChoicePanel', () => {
  it('окно делит существ на обычных, уникальных и НПС', async () => {
    stubCatalog();
    const onPick = vi.fn();
    renderWithProviders(<Harness onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /Монстр или НПС/ }));

    expect(
      await screen.findByRole('button', { name: /^.?Крыса/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Король/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Уникальные' }));
    expect(
      await screen.findByRole('button', { name: /Король/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^.?Крыса/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'НПС' }));
    fireEvent.click(await screen.findByRole('button', { name: /Серафина/ }));
    expect(onPick).toHaveBeenCalledWith({
      kind: 'creature',
      entry: expect.objectContaining({ kind: 'npc', id: SERA }) as unknown,
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});

describe('PlacePickerModal без существ', () => {
  it('у «Строить» на сцене нет вкладки «Существа», и поиск не спрашивает монстров', async () => {
    const fetchMock = stubCatalog();
    renderWithProviders(
      <PlacePickerModal
        block="stone"
        current={null}
        recent={[]}
        blocksOnly={false}
        withoutCreatures
        onPickBlock={vi.fn()}
        onPickObject={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Обстановка' })).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Существа' }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск' }), {
      target: { value: 'кр' },
    });
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => url.includes('kind=item')),
      ).toBe(true),
    );
    expect(
      fetchMock.mock.calls.some(([url]) => /kind=(monster|npc)/.test(url)),
    ).toBe(false);
  });
});
