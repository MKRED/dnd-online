import { Alert, Button, Loader, Text } from '@mantine/core';
import { IconPlayerTrackNext } from '@tabler/icons-react';
import { useState, type KeyboardEvent } from 'react';
import type { GameCombatant } from 'shared';
import { AttackWindow, type AttackWindowStart } from '../AttackWindow';
import type { SceneCombat } from '../useSceneCombat';
import AttackTargets from './AttackTargets';
import PendingDamage from './PendingDamage';
import ResourcePips from './ResourcePips';
import TurnConfirm from './TurnConfirm';
import TurnGroups from './TurnGroups';
import WeaponSetSwitch from './WeaponSetSwitch';
import { activeSet } from './attackTiles';
import { slotsLine } from './slotsLine';
import { spellLevels } from './spellLevels';
import { turnTiles, type TurnState } from './turnTiles';
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
  const [attackWindow, setAttackWindow] = useState<AttackWindowStart | null>(
    null,
  );
  const state: TurnState = {
    resources: combatant.resources,
    ownTurn,
    dodging: combatant.dodging,
    disengaged: combatant.disengaged,
    attack: combatant.attack,
  };
  const tiles = view.kit ? turnTiles(view.kit, state) : [];
  const selected = tiles.find((t) => t.key === chosen) ?? null;
  const set = view.kit ? activeSet(view.kit, state) : null;
  const pending = combatant.attack?.pending ?? null;
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
        attacksHead={
          set && view.kit?.weaponSets?.both ? (
            <WeaponSetSwitch
              value={set}
              blocked={
                !ownTurn
                  ? 'Сейчас не ваш ход'
                  : !master && combatant.attack?.setSwitched
                    ? 'Набор оружия уже переключали в этот ход'
                    : null
              }
              busy={combat.busy}
              onChange={(next) =>
                void combat.setWeaponSet(combatant.id, next).then(done)
              }
            />
          ) : null
        }
      />
      {selected?.use.kind === 'attack' && !selected.block ? (
        <AttackTargets
          key={selected.key}
          combatantId={combatant.id}
          tile={selected}
          attack={selected.use.attack}
          combat={combat}
          refresh={`${version}:${combat.combat?.eventSeq ?? 0}`}
          onCancel={() => setChosen(null)}
          onConfirm={(target) => {
            if (selected.use.kind !== 'attack') return;
            setAttackWindow({
              kind: 'attack',
              attack: selected.use.attack,
              name: selected.name,
              target,
            });
            setChosen(null);
          }}
        />
      ) : selected ? (
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
      {pending && (
        <PendingDamage
          pending={pending}
          onRoll={() => setAttackWindow({ kind: 'damage', pending })}
        />
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
          disabled={pending !== null}
          onClick={() => void combat.endTurn(combatant.id)}
        >
          Закончить ход
        </Button>
      )}
      {attackWindow && (
        <AttackWindow
          combatantId={combatant.id}
          attackerName={combatant.name}
          start={attackWindow}
          master={master}
          onAttack={(mode) =>
            attackWindow.kind === 'attack'
              ? combat.attack(combatant.id, {
                  attack: attackWindow.attack,
                  target: attackWindow.target.ref,
                  ...(mode === null ? {} : { mode }),
                })
              : Promise.reject(new Error('Атака уже брошена'))
          }
          onDamage={() => combat.damage(combatant.id)}
          onClose={() => setAttackWindow(null)}
        />
      )}
    </section>
  );
}

export default TurnPanel;
