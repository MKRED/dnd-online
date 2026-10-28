import { Alert, Button, Loader, Text } from '@mantine/core';
import { IconPlayerTrackNext } from '@tabler/icons-react';
import { useState, type KeyboardEvent } from 'react';
import type { GameCombatant } from 'shared';
import type { SceneCombat } from '../useSceneCombat';
import ResourcePips from './ResourcePips';
import TurnConfirm from './TurnConfirm';
import TurnGroups from './TurnGroups';
import { slotsLine } from './slotsLine';
import { spellLevels } from './spellLevels';
import { turnTiles } from './turnTiles';
import { useTurnKit, type TurnKitSource } from './useTurnKit';
import classes from './TurnPanel.module.css';

interface TurnPanelProps {
  gameId: string;
  // Участник с ресурсами: их видит тот, кто его водит.
  combatant: GameCombatant & {
    resources: NonNullable<GameCombatant['resources']>;
  };
  ownTurn: boolean;
  // Не его ход: «Ходит Лира» или «Ход противника».
  waiting: string | null;
  source: TurnKitSource;
  version: number;
  movement: string | null;
  master: boolean;
  combat: SceneCombat;
}

// Блок «Ваш ход» (docs/plan/combat.md, этап 4, вариант Г): сколько чего осталось на ход,
// значки атак, заклинаний по кругам, умений и обычных действий; нажатый значок — подсказка
// и кнопка под сеткой. У игрока — во вкладке «Персонаж», у мастера — сверху «Участников»
// в ход монстра или НПС.
function TurnPanel({
  gameId,
  combatant,
  ownTurn,
  waiting,
  source,
  version,
  movement,
  master,
  combat,
}: TurnPanelProps) {
  const view = useTurnKit(gameId, source, version);
  const [chosen, setChosen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const tiles = view.kit
    ? turnTiles(view.kit, {
        resources: combatant.resources,
        ownTurn,
        dodging: combatant.dodging,
        disengaged: combatant.disengaged,
      })
    : [];
  const selected = tiles.find((t) => t.key === chosen) ?? null;
  const levels = spellLevels(tiles, view.kit?.slots ?? null);
  // Ячейки кругов со своими заклинаниями стоят у подзаголовков, сверху — остальные.
  const slots = view.kit
    ? slotsLine(
        view.kit.slots,
        new Set(levels.flatMap((l) => (l.level ? [l.level] : []))),
      )
    : null;
  const done = (ok: boolean) => ok && setChosen(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && chosen) {
      e.stopPropagation();
      setChosen(null);
    }
  };

  return (
    <section
      className={classes.panel}
      aria-label={`Ход: ${combatant.name}`}
      onKeyDown={onKeyDown}
    >
      <div className={classes.head}>
        <Text fw={700} className={classes.title} truncate>
          {ownTurn
            ? master
              ? `Ход: ${combatant.name}`
              : 'Ваш ход'
            : (waiting ?? 'Не ваш ход')}
        </Text>
        <ResourcePips
          resources={combatant.resources}
          onSet={
            master
              ? (input) => void combat.setResources(combatant.id, input)
              : null
          }
          busy={combat.busy}
        />
      </div>
      {(movement || slots) && (
        <Text size="xs" c="dimmed" className={classes.meta}>
          {movement && <span>движение {movement}</span>}
          {slots && <span>ячейки {slots}</span>}
        </Text>
      )}
      {view.error && <Alert color="red">{view.error}</Alert>}
      {!view.kit && !view.error && <Loader size="sm" />}
      <TurnGroups
        tiles={tiles}
        levels={levels}
        chosen={chosen}
        onChoose={setChosen}
        onHover={setHovered}
        itemImage={view.itemImage}
        abilityImage={view.abilityImage}
      />
      {selected ? (
        <TurnConfirm
          key={selected.key}
          tile={selected}
          slots={view.kit?.slots ?? null}
          busy={combat.busy}
          onCancel={() => setChosen(null)}
          onAction={() => {
            if (selected.use.kind !== 'action') return;
            void combat
              .takeAction(combatant.id, selected.use.action)
              .then(done);
          }}
          onAbility={(slotLevel) => {
            if (selected.use.kind !== 'ability') return;
            const { abilityId } = selected.use;
            void combat
              .applyAbility(combatant.id, {
                abilityId,
                ...(slotLevel === null ? {} : { slotLevel }),
              })
              .then(done);
          }}
        />
      ) : (
        tiles.length > 0 && (
          <Text size="xs" c={hovered ? undefined : 'dimmed'} mih={18}>
            {hovered ?? 'Нажмите на значок'}
          </Text>
        )
      )}
      {combat.error && (
        <Text size="xs" c="red" role="alert">
          {combat.error}
        </Text>
      )}
      {ownTurn && (
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlayerTrackNext size={15} />}
          loading={combat.busy}
          onClick={() => void combat.endTurn(combatant.id)}
        >
          Закончить ход
        </Button>
      )}
    </section>
  );
}

export default TurnPanel;
