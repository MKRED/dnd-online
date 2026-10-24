import { Alert, Button, Group, Loader, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { SPELL_SLOT_CIRCLES, type Character } from 'shared';
import { EffectLinksStrip, SpellSlotPips } from '../../../features/characters';
import { gameCharacterBase } from '../../../features/games';
import DeathSavesEditor from './DeathSavesEditor';
import HitPointsControls from './HitPointsControls';
import classes from './creatures.module.css';
import { useGameCharacter } from './useGameCharacter';

interface CharacterStateCardProps {
  gameId: string;
  characterId: string;
  // Растёт с событиями состояния существ — лист перечитывается.
  version: number;
  onOpenSheet: () => void;
  // В окне карточки (docs/plan/scene-page.md, этап 4): без своей шапки — имя в шапке окна.
  bare?: boolean;
  // Что показать под состоянием тем же листом (вкладки окна) — без второй загрузки.
  below?: (character: Character) => ReactNode;
}

// Карточка персонажа игрока в панели сцены (docs/plan/done/game.md, этап 8): тем, кто его
// ведёт, — хиты, спасброски на нуле, ячейки и эффекты. Правка пишется в лист владельца.
function CharacterStateCard({
  gameId,
  characterId,
  version,
  onOpenSheet,
  bare,
  below,
}: CharacterStateCardProps) {
  const { character, setCharacter, change, busy, error } = useGameCharacter(
    gameId,
    characterId,
    version,
  );
  if (!character) {
    return error ? <Alert color="red">{error}</Alert> : <Loader size="sm" />;
  }
  const slots = SPELL_SLOT_CIRCLES.flatMap((level) => {
    const slot = character.spellSlots[level];
    return slot && slot.total > 0 ? [{ level, slot }] : [];
  });
  const saves =
    character.hitPointsCurrent === 0 ||
    character.deathSaveSuccesses + character.deathSaveFailures > 0;

  return (
    <Stack
      gap="xs"
      className={classes.card}
      aria-label={`Карточка: ${character.name}`}
    >
      {!bare && (
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} truncate>
            {character.name}
          </Text>
          <Button size="compact-xs" variant="subtle" onClick={onOpenSheet}>
            Карточка
          </Button>
        </Group>
      )}
      <HitPointsControls
        current={character.hitPointsCurrent}
        max={character.hitPointsMax}
        temp={character.hitPointsTemp}
        busy={busy}
        onChange={(next) => void change(next)}
      />
      {saves && (
        <DeathSavesEditor
          successes={character.deathSaveSuccesses}
          failures={character.deathSaveFailures}
          busy={busy}
          onChange={(successes, failures) =>
            void change({ kind: 'death_saves', successes, failures })
          }
        />
      )}
      {slots.length > 0 && (
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Ячейки заклинаний
          </Text>
          {slots.map(({ level, slot }) => (
            <Group key={level} gap={4} wrap="nowrap">
              <Text size="xs" w={50}>
                {level} круг
              </Text>
              <SpellSlotPips
                level={level}
                slots={slot}
                busy={busy}
                onSpend={(expended) =>
                  void change({
                    kind: 'spell_slots',
                    expended: { [level]: expended },
                  })
                }
              />
            </Group>
          ))}
        </Stack>
      )}
      <EffectLinksStrip
        effects={character.effects}
        apiBase={`${gameCharacterBase(gameId, characterId)}/effects`}
        owner="character"
        onChange={(effects) => setCharacter({ ...character, effects })}
      />
      {error && <Alert color="red">{error}</Alert>}
      {below?.(character)}
    </Stack>
  );
}

export default CharacterStateCard;
