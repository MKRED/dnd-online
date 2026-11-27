import { Alert, Loader, Stack, Text } from '@mantine/core';
import type { GameCreature, GameFigure, MapObject } from 'shared';
import { CharacterSheetSection } from '../../../features/characters';
import {
  prepareGameCreatureSpell,
  spendGameCreatureSlots,
} from '../../../features/games';
import { MonsterCardSection } from '../../../features/monsters/MonsterCard';
import CharacterStateCard from '../creatures/CharacterStateCard';
import CreatureStateCard from '../creatures/CreatureStateCard';
import MovementRow from '../creatures/MovementRow';
import type { useCreatureCards } from '../creatures';
import CardTabs from './CardTabs';
import { gameEquipment, gameInventory } from './gameSheetPlay';
import { npcInstanceSheet } from './npcInstanceSheet';
import { useLibraryRecord } from './useLibraryRecord';

interface CharacterCardBodyProps {
  gameId: string;
  characterId: string;
  version: number;
  // Фигурка на сцене — её запас движения; null — персонаж не на сцене.
  figure: GameFigure | null;
  onAllowance?: (change: 'refresh' | 'dash') => void;
  busy: boolean;
  // Герой отряда у игрока: только чтение (docs/plan/done/scene-page.md, этап 5).
  readOnly: boolean;
  // Тактический режим: доспех и настройку не сменить (docs/plan/equipment.md, этап 4).
  combat: boolean;
  // Мастер кладёт и перекладывает вещи героя (docs/plan/gm-items.md, этап 1).
  master: boolean;
}

// Окно персонажа игрока: состояние сверху (то же, что в панели), под ним вкладки листа
// из того же ответа — без второй загрузки.
export function CharacterCardBody({
  gameId,
  characterId,
  version,
  figure,
  onAllowance,
  busy,
  readOnly,
  combat,
  master,
}: CharacterCardBodyProps) {
  return (
    <CharacterStateCard
      gameId={gameId}
      characterId={characterId}
      version={version}
      onOpenSheet={() => undefined}
      bare
      readOnly={readOnly}
      below={(character, change, apply) => (
        <Stack gap="sm">
          {figure && (
            <MovementRow
              name={character.name}
              movement={figure}
              onAllowance={onAllowance}
              busy={busy}
            />
          )}
          <CardTabs
            render={(section) => (
              <CharacterSheetSection
                character={character}
                section={section}
                // Ячейки — как в шапке окна; подготовку героя в игре пока не меняют.
                spellActions={
                  change && {
                    spend: (expended) =>
                      change({ kind: 'spell_slots', expended }),
                  }
                }
                equipment={
                  apply && gameEquipment(gameId, characterId, combat, apply)
                }
                inventory={
                  master && apply
                    ? gameInventory(gameId, characterId, combat, apply)
                    : undefined
                }
              />
            )}
          />
        </Stack>
      )}
    />
  );
}

interface CreatureCardBodyProps {
  gameId: string;
  creature: GameCreature | null;
  object: MapObject | undefined;
  cards: ReturnType<typeof useCreatureCards>;
}

// Окно монстра или НПС у мастера: хиты и эффекты экземпляра сверху, вкладки — из копии
// в библиотеке игры. Ячейки и «подготовлено» у НПС — свои у экземпляра (замечания после
// первой партии, 2026-10-26, вариант А): кружки и отметки во вкладке «Способности».
export function CreatureCardBody({
  gameId,
  creature,
  object,
  cards,
}: CreatureCardBodyProps) {
  const source =
    object?.kind === 'monster'
      ? { kind: 'monster' as const, id: object.monsterId }
      : object?.kind === 'npc'
        ? { kind: 'npc' as const, id: object.characterId }
        : null;
  const { loaded, error } = useLibraryRecord(gameId, source);
  const state = creature?.state;
  if (!creature || !state) {
    return (
      <Text size="sm" c="dimmed">
        Существа больше нет на сцене.
      </Text>
    );
  }
  const { objectId } = creature;
  return (
    <Stack gap="sm">
      <CreatureStateCard
        gameId={gameId}
        objectId={objectId}
        state={state}
        onChanged={cards.creatures.apply}
        onEffects={cards.creatures.reload}
        onOpenSheet={() => undefined}
        bare
      />
      {creature.health !== 'down' && creature.health !== 'dead' && (
        <MovementRow
          name={state.name}
          movement={state.movement}
          onAllowance={(change) => cards.walk.allowance(objectId, change)}
          busy={cards.walk.busy}
        />
      )}
      {error && <Alert color="red">{error}</Alert>}
      {!loaded && !error && <Loader size="sm" />}
      {loaded && (
        <CardTabs
          render={(section) =>
            loaded.kind === 'monster' ? (
              <MonsterCardSection
                monster={loaded.record}
                extraEffects={state.effects}
                section={section}
              />
            ) : loaded.kind === 'npc' ? (
              <CharacterSheetSection
                character={npcInstanceSheet(loaded.record, state.spells)}
                section={section}
                spellActions={{
                  spend: (expended) =>
                    spendGameCreatureSlots(gameId, objectId, expended).then(
                      cards.creatures.apply,
                    ),
                  prepare: (abilityId, prepared) =>
                    prepareGameCreatureSpell(
                      gameId,
                      objectId,
                      abilityId,
                      prepared,
                    ).then(cards.creatures.apply),
                }}
              />
            ) : null
          }
        />
      )}
    </Stack>
  );
}
