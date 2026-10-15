import { Badge, Group } from '@mantine/core';
import type { SimpleCatalogDef, SimpleEntry } from './simpleCatalogs';

// Бейджи записи: категория и, в «Моих», пометка о скрытой записи.
function SimpleBadges({
  def,
  entry,
  showHidden,
}: {
  def: SimpleCatalogDef;
  entry: SimpleEntry;
  showHidden: boolean;
}) {
  return (
    <Group gap={4}>
      <Badge size="xs" variant="light" color="gray">
        {def.categoryLabels[entry.category]}
      </Badge>
      {showHidden && !entry.isPublic && (
        <Badge size="xs" variant="outline" color="gray">
          {def.texts.hidden}
        </Badge>
      )}
    </Group>
  );
}

export default SimpleBadges;
