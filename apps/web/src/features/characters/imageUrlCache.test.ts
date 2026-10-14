import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acquireImageUrl,
  peekImageUrl,
  releaseImageUrl,
  type ImageRequest,
} from './imageUrlCache';

// У каждого теста своя картинка: кеш живёт на уровне модуля.
let counter = 0;
function nextRequest(): ImageRequest {
  counter += 1;
  return { characterId: 'c', imageId: `image-${counter}`, variant: 'preview' };
}

describe('imageUrlCache', () => {
  const revoke = vi.fn();
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.useFakeTimers();
    revoke.mockClear();
    let urls = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => `blob:test/${(urls += 1)}`,
      revokeObjectURL: revoke,
    });
    fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Blob(['webp']))),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('грузит картинку один раз на всех, кто её показывает', async () => {
    const request = nextRequest();
    const [a, b] = await Promise.all([
      acquireImageUrl(request),
      acquireImageUrl(request),
    ]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(peekImageUrl(request)).toBe(a);
  });

  it('освобождает URL, когда картинку больше никто не показывает', async () => {
    const request = nextRequest();
    const url = await acquireImageUrl(request);
    await acquireImageUrl(request);

    releaseImageUrl(request);
    await vi.runAllTimersAsync();
    // Второй пользователь ещё держит картинку.
    expect(revoke).not.toHaveBeenCalled();

    releaseImageUrl(request);
    await vi.runAllTimersAsync();
    expect(revoke).toHaveBeenCalledWith(url);
    expect(peekImageUrl(request)).toBeUndefined();
  });

  it('не освобождает URL, если картинку снова показали до истечения отсрочки', async () => {
    const request = nextRequest();
    const url = await acquireImageUrl(request);
    releaseImageUrl(request);
    await acquireImageUrl(request);
    await vi.runAllTimersAsync();

    expect(revoke).not.toHaveBeenCalled();
    expect(peekImageUrl(request)).toBe(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('не кеширует неудачную загрузку', async () => {
    const request = nextRequest();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Картинка не найдена' }), {
        status: 404,
      }),
    );
    await expect(acquireImageUrl(request)).rejects.toThrow(
      'Картинка не найдена',
    );
    releaseImageUrl(request);

    await expect(acquireImageUrl(request)).resolves.toMatch(/^blob:test\//);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
