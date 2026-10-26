import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import TurnActions from './TurnActions';

describe('строка «За ход»', () => {
  it('числа из листа со словом в нужной форме', () => {
    renderWithProviders(
      <TurnActions
        character={{
          ...sampleCharacter,
          actionCount: 2,
          bonusActionCount: 1,
          reactionCount: 5,
        }}
      />,
    );
    const strip = within(screen.getByRole('group', { name: 'За ход' }));
    expect(strip.getByText('2 действия')).toBeInTheDocument();
    expect(strip.getByText('1 бонусное')).toBeInTheDocument();
    expect(strip.getByText('5 реакций')).toBeInTheDocument();
  });
});
