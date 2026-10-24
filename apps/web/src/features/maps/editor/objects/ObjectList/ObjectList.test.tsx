import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapObjectSummary } from 'shared';
import { renderWithProviders } from '../../../../../test/render';
import ObjectList from './ObjectList';

const summary = (
  id: number,
  kind: MapObjectSummary['kind'],
  label: string,
): MapObjectSummary => ({ id, kind, label, at: [0, 0, 0], warnings: [] });

const SUMMARIES = [
  summary(1, 'start', 'Старт 1'),
  summary(2, 'monster', 'Гоблин'),
  summary(3, 'container', 'Сундук (предметов: 1)'),
];

beforeEach(() => localStorage.clear());

describe('ObjectList', () => {
  it('группа сворачивается и остаётся свёрнутой; поиск показывает найденное', () => {
    const onPick = vi.fn();
    const { unmount } = renderWithProviders(
      <ObjectList summaries={SUMMARIES} selectedId={null} onPick={onPick} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Существа/ }));
    expect(screen.queryByRole('button', { name: /Гоблин/ })).toBeNull();
    unmount();

    // Свёрнутое запомнилось; поиск по номеру раскрывает группу с находкой.
    renderWithProviders(
      <ObjectList summaries={SUMMARIES} selectedId={null} onPick={onPick} />,
    );
    expect(screen.queryByRole('button', { name: /Гоблин/ })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Найти на карте' }), {
      target: { value: '№2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Гоблин/ }));
    expect(onPick).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('button', { name: /Старт 1/ })).toBeNull();
  });
});
