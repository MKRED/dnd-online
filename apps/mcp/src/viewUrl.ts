// Ссылка на страницу карты с заданной камерой и срезом — формат описан в
// apps/web/src/features/maps/cameraView.ts. Агент открывает её через MCP браузера.

export const VIEWS = ['top', 'north', 'south', 'west', 'east'] as const;

export interface ViewOptions {
  view?: (typeof VIEWS)[number];
  y?: number;
  cam?: [number, number, number];
  target?: [number, number, number];
}

export function buildViewUrl(
  webUrl: string,
  mapId: string,
  { view, y, cam, target }: ViewOptions,
): string {
  const params = new URLSearchParams();
  if (view) params.set('view', view);
  if (y !== undefined) params.set('y', String(y));
  if (cam) params.set('cam', cam.join(','));
  if (target) params.set('target', target.join(','));
  const query = params.toString();
  return `${webUrl}/maps/${mapId}${query ? `?${query}` : ''}`;
}
