import {
  formatActivation,
  spendBlock,
  turnSpendOf,
  type AbilityLinkCard,
  type CatalogImage,
  type CombatAction,
  type CombatantResources,
  type SpellSlots,
  type TurnSpend,
} from 'shared';
import type { GameIconName } from './gameIcons';

// Значки блока «Ваш ход» (docs/plan/combat.md, этап 4, вариант Г): атаки из оружия в руках
// и безоружный удар, заклинания, умения и обычные действия. Что можно нажать сейчас и
// почему нельзя — здесь же, чтобы блок только раскладывал.

export type TileGroup = 'attacks' | 'spells' | 'abilities' | 'actions';

export const TILE_GROUP_LABELS: Record<TileGroup, string> = {
  attacks: 'Атаки',
  spells: 'Заклинания',
  abilities: 'Умения',
  actions: 'Действия',
};

// Что делает «подтверждение»: обычное действие, «Применить» способность или ничего (атаки
// оружием — на этапе 5, пока только описание).
export type TileUse =
  | { kind: 'action'; action: CombatAction }
  | { kind: 'ability'; abilityId: string; slotMin: number | null }
  | { kind: 'info' };

export interface TurnTile {
  key: string;
  group: TileGroup;
  name: string;
  // Строка под сеткой: что это и сколько стоит.
  tip: string;
  cost: TurnSpend | null;
  // Круг заклинания (0 — заговор) в углу.
  corner: string | null;
  // Картинка справочника; без неё — значок по виду на сером.
  image: { id: string; image: CatalogImage | null } | null;
  icon: GameIconName;
  use: TileUse;
  // Почему сейчас нельзя; null — можно.
  block: string | null;
}

export interface TurnKitAttack {
  key: string;
  name: string;
  tip: string;
  bonusAction: boolean;
  image: { id: string; image: CatalogImage | null } | null;
}

export interface TurnKitAbility {
  id: string;
  prepared: boolean | null;
  ability: AbilityLinkCard;
}

export interface TurnKit {
  attacks: TurnKitAttack[];
  // Строка безоружного удара; null — у монстра (его атаки — в стат-блоке).
  unarmed: string | null;
  abilities: TurnKitAbility[];
  // Ячейки; null — их нет (монстр: заклинания в день пока не считаются).
  slots: SpellSlots | null;
}

export interface TurnState {
  resources: CombatantResources;
  ownTurn: boolean;
  dodging: boolean;
  disengaged: boolean;
}

const ACTIONS: {
  action: CombatAction;
  name: string;
  icon: GameIconName;
  tip: string;
}[] = [
  {
    action: 'dash',
    name: 'Рывок',
    icon: 'sprint',
    tip: 'Действие: ещё одна Скорость к запасу движения на этот ход',
  },
  {
    action: 'disengage',
    name: 'Отход',
    icon: 'exit',
    tip: 'Действие: до конца хода движение не провоцирует атак',
  },
  {
    action: 'dodge',
    name: 'Уклонение',
    icon: 'dodge',
    tip: 'Действие: до начала вашего хода атаки по вам с помехой, спасброски Ловкости с преимуществом',
  },
];

const ATTACK_LATER = 'Атаковать можно будет со следующим этапом';

export function turnTiles(kit: TurnKit, state: TurnState): TurnTile[] {
  const block = (spend: TurnSpend) =>
    spendBlock(spend, state.resources, state.ownTurn);
  const tiles: TurnTile[] = kit.attacks.map((a) => ({
    key: `attack:${a.key}`,
    group: 'attacks',
    name: a.name,
    tip: a.tip,
    cost: a.bonusAction ? 'bonus_action' : 'action',
    corner: null,
    image: a.image,
    icon: 'weapon',
    use: { kind: 'info' },
    block: ATTACK_LATER,
  }));
  if (kit.unarmed !== null) {
    tiles.push({
      key: 'attack:unarmed',
      group: 'attacks',
      name: 'Безоружный удар',
      tip: kit.unarmed,
      cost: 'action',
      corner: null,
      image: null,
      icon: 'punch',
      use: { kind: 'info' },
      block: ATTACK_LATER,
    });
  }
  for (const entry of kit.abilities) {
    const tile = abilityTile(entry, kit.slots, block);
    if (tile) tiles.push(tile);
  }
  for (const a of ACTIONS) {
    const already =
      (a.action === 'dodge' && state.dodging) ||
      (a.action === 'disengage' && state.disengaged);
    tiles.push({
      key: `action:${a.action}`,
      group: 'actions',
      name: a.name,
      tip: a.tip,
      cost: 'action',
      corner: null,
      image: null,
      icon: a.icon,
      use: { kind: 'action', action: a.action },
      block: block('action') ?? (already ? `${a.name} уже действует` : null),
    });
  }
  return tiles;
}

// Черта действует сама — её в сетке нет. Заклинание без свободной ячейки нужного круга
// или неподготовленное — бледное, с причиной.
function abilityTile(
  { id, prepared, ability }: TurnKitAbility,
  slots: SpellSlots | null,
  block: (spend: TurnSpend) => string | null,
): TurnTile | null {
  if (ability.activation.kind === 'trait') return null;
  const spend = turnSpendOf(ability.activation);
  const spell = ability.category === 'spell';
  const slotMin = slots ? (ability.costs.spellSlot?.minLevel ?? null) : null;
  const level = spell && ability.level !== null ? ability.level : null;
  const parts = [ability.name, formatActivation(ability.activation)];
  if (level !== null) parts.push(level === 0 ? 'заговор' : `${level} круг`);
  return {
    key: `ability:${id}`,
    group: spell ? 'spells' : 'abilities',
    name: ability.name,
    tip: parts.join(' · '),
    cost: spend,
    corner: level === null ? null : String(level),
    image: { id: ability.id, image: ability.image },
    icon: spell ? 'spell' : 'rune',
    use: { kind: 'ability', abilityId: id, slotMin },
    block:
      spend === null
        ? 'В бою так не применить'
        : prepared === false && spell && (level ?? 0) >= 1
          ? 'Не подготовлено'
          : slotMin !== null && freeSlotLevels(slots, slotMin).length === 0
            ? `Нет свободных ячеек ${slotMin} круга и выше`
            : block(spend),
  };
}

// Круги со свободной ячейкой не ниже min — выбор круга у «Применить».
export function freeSlotLevels(
  slots: SpellSlots | null,
  min: number,
): number[] {
  if (!slots) return [];
  return Object.entries(slots)
    .map(([level, slot]) => ({ level: Number(level), slot }))
    .filter(
      ({ level, slot }) => level >= min && slot && slot.expended < slot.total,
    )
    .map(({ level }) => level)
    .sort((a, b) => a - b);
}
