import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import AppliedEffectList from './AppliedEffectList';

describe('AppliedEffectList', () => {
  it('без эффектов пишет «Эффектов нет»', () => {
    renderWithProviders(<AppliedEffectList rows={[]} />);
    expect(screen.getByText('Эффектов нет.')).toBeInTheDocument();
  });

  it('эффект — ссылка на запись, с источником и тем, что он даёт', () => {
    renderWithProviders(
      <AppliedEffectList
        rows={[
          {
            key: 'e:1',
            kind: 'effect',
            id: 'grab',
            name: 'Захват',
            source: 'наложен в игре',
            lines: [{ text: 'Схваченный', details: ['Скорость 0'] }],
            idle: null,
          },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Захват' })).toHaveAttribute(
      'href',
      '/effects/grab',
    );
    expect(screen.getByText(/наложен в игре/)).toBeInTheDocument();
    expect(screen.getByText('Скорость 0')).toBeInTheDocument();
  });
});
