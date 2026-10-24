import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import type { SceneFogControls } from '../fog';
import ServiceSection from './ServiceSection';

function controls(over: Partial<SceneFogControls> = {}): SceneFogControls {
  return {
    busy: false,
    error: null,
    fogOn: true,
    sightRange: 60,
    eyes: false,
    setEyes: vi.fn(),
    save: vi.fn(),
    refresh: vi.fn(),
    reset: vi.fn(),
    resetState: 'idle',
    resetError: null,
    masks: null,
    ...over,
  };
}

const expand = () => fireEvent.click(screen.getByText(/Служебное/));

describe('ServiceSection', () => {
  it('resets the fog only after the confirmation', () => {
    const fog = controls();
    renderWithProviders(<ServiceSection fog={fog} />);
    expand();
    fireEvent.click(
      screen.getByRole('button', { name: 'Сбросить туман войны' }),
    );
    expect(fog.reset).not.toHaveBeenCalled();
    expect(screen.getByText(/Отменить нельзя/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(fog.reset).toHaveBeenCalledTimes(1);
  });

  it('keeps the fog on cancel', () => {
    const fog = controls();
    renderWithProviders(<ServiceSection fog={fog} />);
    expand();
    fireEvent.click(
      screen.getByRole('button', { name: 'Сбросить туман войны' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(fog.reset).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Сбросить туман войны' }),
    ).toBeInTheDocument();
  });

  it('is disabled without the fog and says why', () => {
    renderWithProviders(<ServiceSection fog={controls({ fogOn: false })} />);
    expand();
    expect(
      screen.getByRole('button', { name: 'Сбросить туман войны' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Сброс тумана доступен, когда туман войны включён.'),
    ).toBeInTheDocument();
  });

  it('shows the result and the error', () => {
    const { rerender } = renderWithProviders(
      <ServiceSection fog={controls({ resetState: 'done' })} />,
    );
    expand();
    expect(screen.getByText(/Туман сброшен/)).toBeInTheDocument();
    rerender(
      <ServiceSection
        fog={controls({ resetError: 'Туман войны на сцене выключен' })}
      />,
    );
    expect(
      screen.getByText('Туман войны на сцене выключен'),
    ).toBeInTheDocument();
  });
});
