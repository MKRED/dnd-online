import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import SheetHeader from './SheetHeader';

describe('SheetHeader', () => {
  it('показывает число героического вдохновения', () => {
    renderWithProviders(
      <SheetHeader
        character={{ ...sampleCharacter, heroicInspiration: 3 }}
        aside={null}
      />,
    );
    expect(screen.getByText('Героическое вдохновение: 3')).toBeInTheDocument();
  });

  it('помечает НПС, а игрового — нет', () => {
    const { unmount } = renderWithProviders(
      <SheetHeader
        character={{ ...sampleCharacter, kind: 'npc' }}
        aside={null}
      />,
    );
    expect(screen.getByText('НПС')).toBeInTheDocument();
    unmount();
    renderWithProviders(
      <SheetHeader character={sampleCharacter} aside={null} />,
    );
    expect(screen.queryByText('НПС')).not.toBeInTheDocument();
  });

  it('без вдохновения значка нет', () => {
    renderWithProviders(
      <SheetHeader
        character={{ ...sampleCharacter, heroicInspiration: 0 }}
        aside={null}
      />,
    );
    expect(
      screen.queryByText(/Героическое вдохновение/),
    ).not.toBeInTheDocument();
  });
});
