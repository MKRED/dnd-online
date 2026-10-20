import sharp from 'sharp';
import { vi } from 'vitest';

// Поддельный ComfyUI для тестов: отвечает по адресу запроса, как настоящий HTTP API.
export type Route = (body: unknown) => unknown;

export const pngImage = (width = 1024, height = 768) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 20, b: 20 } },
  })
    .png()
    .toBuffer();

export function fakeComfy(routes: Record<string, Route | Buffer>) {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const route = routes[key];
    if (route === undefined) {
      return Promise.resolve(new Response('not found', { status: 404 }));
    }
    if (Buffer.isBuffer(route)) {
      return Promise.resolve(new Response(new Uint8Array(route)));
    }
    const body: unknown = init?.body
      ? JSON.parse(String(init.body))
      : undefined;
    return Promise.resolve(Response.json(route(body)));
  });
}
