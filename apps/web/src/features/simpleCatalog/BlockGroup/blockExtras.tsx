import { Group, Text } from '@mantine/core';
import { isBlockColor, MATERIALS, type BlockGroup } from 'shared';
import { ShapeSwatch } from '../../maps';
import type { CatalogExtras } from '../catalogExtras';
import type { SimpleEntry } from '../simpleCatalogs';
import BlockFields from './BlockFields';
import { blockTraitRows } from './blockCard';
import { fromBlockValues } from './blockForm';
import BlockShapes from './BlockShapes';

const isBlockGroup = (entry: SimpleEntry): entry is BlockGroup =>
  'look' in entry;

// Свои поля раздела «Блоки» (docs/plan/blocks.md, этап 4).
export const BLOCK_EXTRAS: CatalogExtras = {
  Field: BlockFields,
  toInput: (values) => fromBlockValues(values.block),
  rows: (entry) => {
    if (!isBlockGroup(entry)) return [];
    return [
      {
        label: 'Основа',
        value: (
          <Group gap="xs" wrap="nowrap" component="span">
            <ShapeSwatch material={entry.look} shape="cube" size={20} />
            <Text span size="sm">
              {MATERIALS[entry.look].label}
            </Text>
          </Group>
        ),
      },
      {
        label: 'Основной цвет',
        value: (
          <Group gap="xs" wrap="nowrap" component="span">
            {/* Строка карточки — абзац, а ColorSwatch рисует div: свой кружок из span. */}
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: entry.color,
                boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 25%)',
              }}
            />
            <Text span size="sm">
              {entry.color}
            </Text>
          </Group>
        ),
      },
      ...blockTraitRows(entry),
    ];
  },
  listValue: () => null,
  picture: {
    entry: (entry, size) =>
      isBlockGroup(entry) &&
      (size === 'card' ? (
        <BlockShapes group={entry} />
      ) : (
        <ShapeSwatch
          material={entry.look}
          color={entry.color}
          shape="cube"
          size={size === 'grid' ? 120 : 36}
        />
      )),
    // Пока цвет набирают, он бывает недописан («#8a») — тогда образец в цвете основы.
    values: ({ block: { look, color } }) => (
      <BlockShapes
        group={{
          look,
          color: isBlockColor(color) ? color : MATERIALS[look].color,
        }}
      />
    ),
  },
};
