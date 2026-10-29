import { Menu, UnstyledButton } from '@mantine/core';
import type {
  CombatantResources,
  CombatResourcesInput,
  TurnResource,
} from 'shared';
import classes from './TurnPanel.module.css';

type Kind = keyof CombatantResources;

const KINDS: {
  kind: Kind;
  cost: string;
  name: string;
  field: keyof CombatResourcesInput;
}[] = [
  { kind: 'actions', cost: 'action', name: 'Действия', field: 'actionsUsed' },
  {
    kind: 'bonusActions',
    cost: 'bonus_action',
    name: 'Бонусные действия',
    field: 'bonusActionsUsed',
  },
  {
    kind: 'reactions',
    cost: 'reaction',
    name: 'Реакции',
    field: 'reactionsUsed',
  },
];

interface ResourcePipsProps {
  resources: CombatantResources;
  // Мастер правит потраченное меню у метки; игроку метки только показывают.
  onSet: ((input: CombatResourcesInput) => void) | null;
  busy: boolean;
}

const tipOf = (name: string, r: TurnResource) =>
  `${name}: осталось ${r.max - r.used} из ${r.max}`;

// Сколько чего осталось на этот ход: метка цены и число. Потрачено всё — метка бледная.
function ResourcePips({ resources, onSet, busy }: ResourcePipsProps) {
  return (
    <div className={classes.pips}>
      {KINDS.map(({ kind, cost, name, field }) => {
        const r = resources[kind];
        const pip = (
          <>
            <i className={classes.pipMark} data-cost={cost} />
            {r.max - r.used}
          </>
        );
        if (!onSet) {
          return (
            <span
              key={kind}
              className={classes.pip}
              data-spent={r.used >= r.max || undefined}
              title={tipOf(name, r)}
            >
              {pip}
            </span>
          );
        }
        return (
          <Menu key={kind} position="bottom-start" withinPortal>
            <Menu.Target>
              <UnstyledButton
                className={classes.pip}
                data-spent={r.used >= r.max || undefined}
                title={`${tipOf(name, r)}. Поправить`}
                aria-label={`${tipOf(name, r)}. Поправить`}
                disabled={busy}
              >
                {pip}
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{name}: осталось</Menu.Label>
              {Array.from({ length: r.max + 1 }, (_, left) => r.max - left).map(
                (left) => (
                  <Menu.Item
                    key={left}
                    disabled={left === r.max - r.used}
                    onClick={() => onSet({ [field]: r.max - left })}
                  >
                    {left} из {r.max}
                  </Menu.Item>
                ),
              )}
            </Menu.Dropdown>
          </Menu>
        );
      })}
    </div>
  );
}

export default ResourcePips;
