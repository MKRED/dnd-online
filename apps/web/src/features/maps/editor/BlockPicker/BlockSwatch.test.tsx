import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { tileImage } from '../../render/textures/tileImages';
import BlockSwatch from './BlockSwatch';

describe('BlockSwatch', () => {
  it('paints the top and the sides with the material tiles', () => {
    const { container } = render(<BlockSwatch block="grass" />);
    const images = [...container.querySelectorAll('image')].map((image) =>
      image.getAttribute('href'),
    );
    // Куб: верх, южный и восточный бок; у травы верх и бок — разные плитки.
    expect(images).toEqual([
      tileImage('grass', 'top'),
      tileImage('grass', 'side'),
      tileImage('grass', 'side'),
    ]);
    expect(images[0]).toMatch(/^data:image\/png;base64,/);
  });

  it('clips each face to its own outline', () => {
    const { container } = render(
      <>
        <BlockSwatch block="stone_slab" />
        <BlockSwatch block="stone_slab" />
      </>,
    );
    const ids = [...container.querySelectorAll('clipPath')].map(
      (clip) => clip.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
