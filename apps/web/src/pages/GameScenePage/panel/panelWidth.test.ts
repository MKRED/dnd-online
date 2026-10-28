import { afterEach, describe, expect, it } from 'vitest';
import {
  clampPanelWidth,
  collapsesAt,
  DEFAULT_PANEL_WIDTH,
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

  it('запоминается на устройстве; без записи или с мусором — обычная', () => {
    expect(readPanelWidth()).toBe(DEFAULT_PANEL_WIDTH);
    savePanelWidth(480);
    expect(readPanelWidth()).toBe(480);
    for (const junk of ['abc', '100', '-1', 'Infinity']) {
      localStorage.setItem('scene.panelWidth', junk);
      expect(readPanelWidth()).toBe(DEFAULT_PANEL_WIDTH);
    }
  });
});
