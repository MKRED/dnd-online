import { renderHook, waitFor } from '@testing-library/react';
import { Texture, TextureLoader } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acquireImageUrl,
  releaseImageUrl,
} from '../../../../lib/imageUrlCache';
import { useObjectTextures } from './useObjectTextures';

vi.mock('../../../../lib/imageUrlCache', () => ({
  acquireImageUrl: vi.fn(),
  releaseImageUrl: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

describe('useObjectTextures', () => {
  it('готово, когда каждая картинка загрузилась или не загрузилась', async () => {
    vi.mocked(acquireImageUrl).mockImplementation((path) =>
      path === '/bad'
        ? Promise.reject(new Error('404'))
        : Promise.resolve(`blob:${path}`),
    );
    vi.spyOn(TextureLoader.prototype, 'loadAsync').mockResolvedValue(
      new Texture(),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result, unmount } = renderHook(() =>
      useObjectTextures(['/good', '/bad']),
    );
    expect(result.current.settled).toBe(false);
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.textures.get('/good')).toBeInstanceOf(Texture);
    expect(result.current.textures.get('/bad')).toBeNull();

    unmount();
    expect(releaseImageUrl).toHaveBeenCalledWith('/good');
    expect(releaseImageUrl).toHaveBeenCalledWith('/bad');
  });

  it('без картинок готово сразу', () => {
    const { result } = renderHook(() => useObjectTextures([]));
    expect(result.current.settled).toBe(true);
  });
});
