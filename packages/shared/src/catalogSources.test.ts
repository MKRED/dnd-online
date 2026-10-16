import { describe, expect, it } from 'vitest';
import {
  CATALOG_SOURCE_MAX_LENGTH,
  CATALOG_SOURCES_MAX,
  isCatalogSources,
  sourceLink,
  sourceLinkLabel,
} from './catalogSources.js';

describe('catalogSources', () => {
  it('принимает до 10 непустых строк без пробелов по краям', () => {
    expect(isCatalogSources([])).toBe(true);
    expect(
      isCatalogSources(['Книга игрока 2024, стр. 42', 'https://next.dnd.su']),
    ).toBe(true);
    expect(isCatalogSources(Array(CATALOG_SOURCES_MAX).fill('Книга'))).toBe(
      true,
    );
    const bad = [
      Array(CATALOG_SOURCES_MAX + 1).fill('Книга'),
      [''],
      [' Книга'],
      ['x'.repeat(CATALOG_SOURCE_MAX_LENGTH + 1)],
      [42],
      'Книга',
      null,
    ];
    for (const value of bad) expect(isCatalogSources(value)).toBe(false);
  });

  it('ссылка — только адрес http или https целиком', () => {
    expect(sourceLink('https://next.dnd.su/spells/10-fly')).toBe(
      'https://next.dnd.su/spells/10-fly',
    );
    expect(sourceLink('  HTTPS://Example.com/a  ')).toBe(
      'https://example.com/a',
    );
    expect(sourceLink('http://dnd.su')).toBe('http://dnd.su/');
    for (const text of [
      'javascript:alert(1)',
      // У этого адреса есть хост: отсекает только проверка схемы.
      'javascript://dnd.su/%0aalert(1)',
      'ftp://dnd.su/book.pdf',
      'data:text/html,hi',
      'https://',
      'Книга игрока 2024',
      'см. https://dnd.su',
      'https://dnd.su и ещё',
      'dnd.su/spells',
    ]) {
      expect(sourceLink(text), text).toBeNull();
    }
  });

  it('текст ссылки — без протокола и косой черты в конце, кириллица как есть', () => {
    expect(sourceLinkLabel('https://next.dnd.su/spells/')).toBe(
      'next.dnd.su/spells',
    );
    expect(sourceLinkLabel('https://dnd.su/заклинания')).toBe(
      'dnd.su/заклинания',
    );
  });
});
