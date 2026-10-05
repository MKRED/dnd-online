import type { MapChunksResponse, MapEditResult, MapInfo, MapOp } from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

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

export function undoMapEdit(id: string): Promise<MapEditResult> {
  return request(`/maps/${id}/undo`, { method: 'POST' });
}

export function redoMapEdit(id: string): Promise<MapEditResult> {
  return request(`/maps/${id}/redo`, { method: 'POST' });
}
