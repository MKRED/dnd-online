import { Text } from '@mantine/core';
import { DetailsField, SourcesList } from '../catalog';
import type { SimpleCatalogDef, SimpleEntry } from './simpleCatalogs';
import SimpleBadges from './SimpleBadges';

// Свойства способности, эффекта или группы блоков: значки, автор, строки раздела, описание и
// источники. Их показывает и страница записи, и окно записи на сцене игры.
function SimpleEntryDetails({
  def,
  entry,
}: {
  def: SimpleCatalogDef;
  entry: SimpleEntry;
}) {
  return (
    <>
      <SimpleBadges def={def} entry={entry} showHidden />
      <DetailsField label="Автор">{entry.authorNickname}</DetailsField>
      {def.extras.rows(entry).map(({ label, value }) => (
        <DetailsField key={label} label={label}>
          {value}
        </DetailsField>
      ))}
      {entry.description && (
        <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {entry.description}
        </Text>
      )}
      <SourcesList sources={entry.sources} />
    </>
  );
}

export default SimpleEntryDetails;
