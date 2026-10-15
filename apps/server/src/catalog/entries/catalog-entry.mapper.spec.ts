import { describe, expect, it } from 'vitest';
import type { AbilityDto } from '../../abilities/dto/ability.dto.js';
import {
  toCatalogEntry,
  toCatalogEntryValues,
  type CatalogEntryRow,
} from './catalog-entry.mapper.js';

const row: CatalogEntryRow = {
  id: 'a1',
  authorId: 'u1',
  isPublic: true,
  name: 'Тёмное зрение',
  category: 'basic',
  details: {},
  description: '60 фт.',
  createdAt: new Date('2026-10-15T10:00:00Z'),
  updatedAt: new Date('2026-10-15T11:00:00Z'),
};

const basic = () => ({ category: 'basic' as const, details: {} });

describe('catalog-entry.mapper', () => {
  it('собирает запись с автором, категорией каталога и датами строкой', () => {
    expect(toCatalogEntry(row, 'Арвен', null, basic)).toEqual({
      id: 'a1',
      authorId: 'u1',
      authorNickname: 'Арвен',
      isPublic: true,
      name: 'Тёмное зрение',
      category: 'basic',
      details: {},
      description: '60 фт.',
      image: null,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T11:00:00.000Z',
    });
  });

  it('отдаёт метаданные картинки без лишних колонок', () => {
    const image = {
      ownerId: 'a1',
      width: 800,
      height: 200,
      thumbCrop: { x: 0, y: -300, size: 800 },
      version: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(toCatalogEntry(row, 'Арвен', image, basic).image).toEqual({
      version: 2,
      width: 800,
      height: 200,
      thumbCrop: { x: 0, y: -300, size: 800 },
    });
  });

  it('пустое описание из формы пишет пустой строкой', () => {
    const dto = {
      name: 'Луч',
      category: 'basic',
      details: {},
      isPublic: false,
    } as AbilityDto;
    expect(toCatalogEntryValues(dto)).toEqual({
      name: 'Луч',
      category: 'basic',
      details: {},
      description: '',
      isPublic: false,
    });
  });
});
