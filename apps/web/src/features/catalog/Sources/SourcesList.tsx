import { Anchor, Stack, Text } from '@mantine/core';
import { sourceLink, sourceLinkLabel } from 'shared';

// Источники на карточке записи. Ссылка — только адрес http(s) целиком (sourceLink),
// открывается в новой вкладке и не получает доступа к нашей (noopener).
function SourcesList({ sources }: { sources: readonly string[] }) {
  if (sources.length === 0) return null;
  return (
    <Stack gap={4}>
      <Text c="dimmed" size="sm">
        Источники
      </Text>
      {sources.map((source, index) => {
        const href = sourceLink(source);
        return (
          <Text key={index} size="sm" style={{ overflowWrap: 'anywhere' }}>
            {href ? (
              <Anchor href={href} target="_blank" rel="noopener noreferrer">
                {sourceLinkLabel(source)} ↗
              </Anchor>
            ) : (
              source
            )}
          </Text>
        );
      })}
    </Stack>
  );
}

export default SourcesList;
