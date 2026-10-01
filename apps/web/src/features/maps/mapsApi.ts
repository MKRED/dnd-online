import type { MapChunksResponse, MapEditResult, MapInfo, MapOp } from 'shared';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api';

export class MapsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ErrorBody {
  message?: string | string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ErrorBody | null;
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Request failed');
    throw new MapsApiError(res.status, message);
  }
  // DELETE отвечает 204 без тела.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function listMaps(): Promise<MapInfo[]> {
  return request('/maps');
}

export function createMap(name: string): Promise<MapInfo> {
  return request('/maps', { method: 'POST', body: JSON.stringify({ name }) });
}

export function getMap(id: string): Promise<MapInfo> {
  return request(`/maps/${id}`);
}

export function deleteMap(id: string): Promise<void> {
  return request(`/maps/${id}`, { method: 'DELETE' });
}

export function getMapChunks(id: string): Promise<MapChunksResponse> {
  return request(`/maps/${id}/chunks`);
}

export function applyMapOps(id: string, ops: MapOp[]): Promise<MapEditResult> {
  return request(`/maps/${id}/ops`, {
    method: 'POST',
    body: JSON.stringify({ ops }),
  });
}
