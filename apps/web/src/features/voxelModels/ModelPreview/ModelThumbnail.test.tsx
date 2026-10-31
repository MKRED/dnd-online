import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyVoxelModel } from 'shared';
import { renderWithProviders } from '../../../test/render';
import ModelThumbnail from './ModelThumbnail';

const draw = vi.hoisted(() => vi.fn(() => 'data:voxels'));
vi.mock('./renderThumbnail', () => ({ modelThumbnail: draw }));
vi.mock('../../../lib/useImageUrls', () => ({
  useImageUrl: (path: string | null) => (path ? `blob:${path}` : undefined),
}));

describe('ModelThumbnail', () => {
  it('без снимка — миниатюра по вокселям', async () => {
    const { container } = renderWithProviders(
      <ModelThumbnail cacheKey="m1" model={emptyVoxelModel()} size={36} />,
    );
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        'data:voxels',
      ),
    );
  });

  it('со снимком модели с файлом — он, воксели не рисуются', () => {
    const { container } = renderWithProviders(
      <ModelThumbnail
        cacheKey="m1"
        model={emptyVoxelModel()}
        size={36}
        snapshot="/voxel-models/m1/image?variant=thumb&v=2"
      />,
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'blob:/voxel-models/m1/image?variant=thumb&v=2',
    );
    expect(draw).not.toHaveBeenCalled();
  });
});
