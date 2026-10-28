import { afterEach, describe, expect, it } from 'vitest';
import {
  clampPanelWidth,
  collapsesAt,
  MIN_PANEL_WIDTH,
  readPanelWidth,
  savePanelWidth,
} from './panelWidth';

afterEach(() => localStorage.clear());

describe('ширина панели на компьютере', () => {
  it('от 18rem до половины страницы', () => {
    expect(clampPanelWidth(100, 1600)).toBe(MIN_PANEL_WIDTH);
    expect(clampPanelWidth(500.4, 1600)).toBe(500);
    expect(clampPanelWidth(1000, 1600)).toBe(800);
  });

  it('на узком окне половина меньше минимума — минимум', () => {
    expect(clampPanelWidth(400, 500)).toBe(MIN_PANEL_WIDTH);
  });

  it('сворачивается, только если утянули дальше минимума с запасом', () => {
    expect(collapsesAt(MIN_PANEL_WIDTH - 10)).toBe(false);
    expect(collapsesAt(MIN_PANEL_WIDTH - 65)).toBe(true);
  });

  it('запоминается на устройстве своя у каждой панели; без записи или с мусором — обычная', () => {
    expect(readPanelWidth('a.width', 352)).toBe(352);
    savePanelWidth('a.width', 480);
    expect(readPanelWidth('a.width', 352)).toBe(480);
    expect(readPanelWidth('b.width', 320)).toBe(320);
    for (const junk of ['abc', '100', '-1', 'Infinity']) {
      localStorage.setItem('a.width', junk);
      expect(readPanelWidth('a.width', 352)).toBe(352);
    }
  });
});
