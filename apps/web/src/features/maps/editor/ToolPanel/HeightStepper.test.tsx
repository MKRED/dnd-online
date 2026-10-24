import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import HeightStepper from './HeightStepper';

describe('HeightStepper', () => {
  it('− и + меняют высоту на слой, не ниже 1', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(
      <HeightStepper value={2} onChange={onChange} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Высота больше на слой' }),
    );
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.click(
      screen.getByRole('button', { name: 'Высота меньше на слой' }),
    );
    expect(onChange).toHaveBeenLastCalledWith(1);
    rerender(<HeightStepper value={1} onChange={onChange} />);
    expect(
      screen.getByRole('button', { name: 'Высота меньше на слой' }),
    ).toBeDisabled();
  });
});
