import { Anchor, Group, ScrollArea, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { Character } from 'shared';
import { CharacterAvatar } from '../../features/characters';
import { charactersForStrip, classesLabel } from './homeSummary';
import classes from './HomePage.module.css';

interface CharacterStripProps {
  characters: Character[];
  // id персонажа → название игры, где он сидит.
  seated: Map<string, string>;
}

// Свои персонажи полосой с прокруткой вбок; последняя плитка — «Новый».
function CharacterStrip({ characters, seated }: CharacterStripProps) {
  return (
    <section aria-label="Мои персонажи">
      <Group justify="space-between" mb="xs">
        <Title order={2} fz="md">
          Мои персонажи
        </Title>
        <Anchor component={Link} to="/characters" size="sm">
          Все персонажи
        </Anchor>
      </Group>
      <ScrollArea scrollbars="x" type="auto">
        <div className={classes.strip}>
          {charactersForStrip(characters).map((c) => {
            const game = seated.get(c.id);
            const sub =
              c.kind === 'npc'
                ? 'НПС'
                : [classesLabel(c), game ? `в «${game}»` : null]
                    .filter(Boolean)
                    .join(' · ');
            return (
              <Link
                key={c.id}
                to={`/characters/${c.id}`}
                className={classes.tile}
              >
                <CharacterAvatar
                  characterId={c.id}
                  name={c.name}
                  mainImage={c.mainImage}
                  size={48}
                />
                <div className={classes.rowText}>
                  <Text fw={600} truncate>
                    {c.name}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {sub}
                  </Text>
                </div>
              </Link>
            );
          })}
          <Link
            to="/characters/new"
            className={`${classes.tile} ${classes.newTile}`}
          >
            <IconPlus size={20} aria-hidden />
            Новый
          </Link>
        </div>
      </ScrollArea>
    </section>
  );
}

export default CharacterStrip;
