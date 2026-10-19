import { Anchor, Badge, Button, Card, Group, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { Character } from 'shared';
import {
  CLASS_LABELS,
  CharacterAvatar,
  SPECIES_LABELS,
} from '../../features/characters';

interface CharacterCardProps {
  character: Character;
  deleting: boolean;
  onDelete: () => void;
}

// Строка списка «Персонажи»: портрет, имя, происхождение, классы, ХП и КД, действия автора.
function CharacterCard({ character, deleting, onDelete }: CharacterCardProps) {
  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start">
        {/* Портрет и имя открывают лист персонажа. */}
        <Group align="flex-start" wrap="nowrap">
          <Link
            to={`/characters/${character.id}`}
            aria-label={`Открыть персонажа ${character.name}`}
          >
            <CharacterAvatar
              characterId={character.id}
              name={character.name}
              mainImage={character.mainImage}
              size="lg"
            />
          </Link>
          <div>
            <Anchor
              component={Link}
              to={`/characters/${character.id}`}
              fw={600}
              c="inherit"
            >
              {character.name}
            </Anchor>
            {/* Чтобы автор помнил, что этот лист видят другие. */}
            {character.linkAccess === 'link' && (
              <Badge size="sm" variant="light" color="teal" ml="xs">
                По ссылке
              </Badge>
            )}
            <Text size="sm" c="dimmed">
              {SPECIES_LABELS[character.species]}
              {character.speciesLineage &&
                ` (${character.speciesLineage})`} · {character.background}
            </Text>
            <Group gap="xs" mt={4}>
              {character.classes.map((entry) => (
                <Badge key={`${entry.class}-${entry.level}`} variant="light">
                  {CLASS_LABELS[entry.class]} {entry.level}
                </Badge>
              ))}
            </Group>
          </div>
        </Group>
        <Group gap="lg">
          <Text size="sm">
            ХП {character.hitPointsCurrent}/{character.hitPointsMax}
          </Text>
          <Text size="sm">КД {character.armorClass}</Text>
          <Button
            component={Link}
            to={`/characters/${character.id}/edit`}
            variant="subtle"
            size="xs"
          >
            Редактировать
          </Button>
          <Button
            color="red"
            variant="subtle"
            size="xs"
            loading={deleting}
            onClick={onDelete}
          >
            Удалить
          </Button>
        </Group>
      </Group>
    </Card>
  );
}

export default CharacterCard;
