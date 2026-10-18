import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Character } from 'shared';
import { TitleWithBookmark } from '../../bookmarks';
import { CLASS_LABELS } from '../characterClasses';
import { SPECIES_LABELS } from '../characterSpecies';

interface SheetHeaderProps {
  character: Character;
  // Кнопки автора или строка «Автор: …» у зрителя — решает страница.
  aside: ReactNode;
}

// Кто это: имя, раса, предыстория, мировоззрение, классы, опыт.
function SheetHeader({ character, aside }: SheetHeaderProps) {
  const origin = [
    SPECIES_LABELS[character.species] +
      (character.speciesLineage ? ` (${character.speciesLineage})` : ''),
    character.background,
    character.alignment,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Stack gap="xs">
      {/* Длинное имя переносится, а не раздвигает страницу шире экрана телефона. */}
      <TitleWithBookmark kind="character" id={character.id}>
        <Title
          order={1}
          style={{
            fontSize: 'min(var(--mantine-h1-font-size), 8vw)',
            overflowWrap: 'anywhere',
          }}
        >
          {character.name}
        </Title>
      </TitleWithBookmark>
      <Text c="dimmed">{origin}</Text>
      <Group gap="xs">
        {character.classes.map((entry) => (
          <Badge key={`${entry.class}-${entry.level}`} variant="light">
            {CLASS_LABELS[entry.class]} {entry.level}
            {entry.subclass && ` · ${entry.subclass}`}
          </Badge>
        ))}
        {character.heroicInspiration > 0 && (
          <Badge color="yellow" variant="light">
            Героическое вдохновение: {character.heroicInspiration}
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        Опыт: {character.experiencePoints}
      </Text>
      {aside}
    </Stack>
  );
}

export default SheetHeader;
