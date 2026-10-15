import { Badge, Group } from '@mantine/core';
import type { SimpleCatalogDef, SimpleEntry } from './simpleCatalogs';

// Бейджи записи: её виды (категория способности, составляющие эффекта) и, в «Моих»,
// пометка о скрытой записи.
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
      {def.kinds.of(entry).map((kind) => (
        <Badge key={kind} size="xs" variant="light" color="gray">
          {def.kinds.labels[kind]}
        </Badge>
      ))}
      {showHidden && !entry.isPublic && (
        <Badge size="xs" variant="outline" color="gray">
          {def.texts.hidden}
        </Badge>
      )}
    </Group>
  );
}

export default SimpleBadges;
