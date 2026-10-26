import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PANEL_SIZE,
  nearestPanelSize,
  nextPanelSize,
  readPanelSize,
  savePanelSize,
} from './panelHeight';

afterEach(() => localStorage.clear());

describe('высота панели на телефоне', () => {
  it('пять положений: дотянутая доля защёлкивается в ближайшем', () => {
    expect(nearestPanelSize(0.05)).toBe(0);
    expect(nearestPanelSize(0.34)).toBe(1);
    expect(nearestPanelSize(0.47)).toBe(3);
    expect(nearestPanelSize(0.9)).toBe(4);
  });

  it('касание — следующее, после пятого снова первое', () => {
    expect(nextPanelSize(2)).toBe(3);
    expect(nextPanelSize(4)).toBe(0);
  });

  it('запоминается на устройстве; без записи или с мусором — среднее', () => {
    expect(readPanelSize()).toBe(DEFAULT_PANEL_SIZE);
    savePanelSize(4);
    expect(readPanelSize()).toBe(4);
    for (const junk of ['abc', '7', '1.5', '-1']) {
      localStorage.setItem('scene.panelSize', junk);
      expect(readPanelSize()).toBe(DEFAULT_PANEL_SIZE);
    }
  });
});
