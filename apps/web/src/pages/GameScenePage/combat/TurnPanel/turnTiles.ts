import {
  formatActivation,
  spendBlock,
  turnSpendOf,
  type AbilityLinkCard,
  type AttackKey,
  type CatalogImage,
  type CombatAction,
  type CombatantAttackState,
  type CombatantResources,
  type SpellSlots,
  type TurnSpend,
  type WeaponSet,
} from 'shared';
import { attackTiles } from './attackTiles';
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

// Что делает «подтверждение»: обычное действие, «Применить» способность, атака со списком
// целей (этап 5) или ничего (атаки НПС — до этапа 6 только описание).
export type TileUse =
  | { kind: 'action'; action: CombatAction }
  | { kind: 'ability'; abilityId: string; slotMin: number | null }
  | { kind: 'attack'; attack: AttackKey }
  | { kind: 'info' };

export interface TurnTile {
  key: string;
  group: TileGroup;
  name: string;
  // Строка под сеткой: что это и сколько стоит.
  tip: string;
  cost: TurnSpend | null;
  // Круг заклинания (0 — заговор): по нему заклинания идут подгруппами; не заклинание — null.
  level: number | null;
  // Картинка справочника; без неё — значок по виду на сером.
  image: { id: string; image: CatalogImage | null } | null;
  icon: GameIconName;
  use: TileUse;
  // Почему сейчас нельзя; null — можно.
  block: string | null;
}

export interface TurnKitAttack {
  key: AttackKey;
  name: string;
  tip: string;
  spend: 'action' | 'bonus_action';
  // Набор куклы; безоружный удар — вне наборов.
  set: WeaponSet | null;
  // Почему этой атакой нельзя совсем (метательное, вторая рука не Лёгкая); null — можно.
  unavailable: string | null;
  image: { id: string; image: CatalogImage | null } | null;
  icon: GameIconName;
}

export interface TurnKitAbility {
  id: string;
  prepared: boolean | null;
  ability: AbilityLinkCard;
}

export interface TurnKit {
  // Оружие в руках куклы и безоружный удар; у монстра пусто (его атаки — в стат-блоке).
  attacks: TurnKitAttack[];
  // Почему атаки только описаны (НПС до этапа 6); null — ими атакуют.
  attackNote: string | null;
  // Набор, пока его не выбирали, и есть ли оружие обоих наборов (тогда виден
  // переключатель «Ближний | Дальний»); null — наборов нет, видны все атаки.
  weaponSets: { initial: WeaponSet; both: boolean } | null;
  abilities: TurnKitAbility[];
  // Ячейки; null — их нет (монстр: заклинания в день пока не считаются).
  slots: SpellSlots | null;
}

export interface TurnState {
  resources: CombatantResources;
  ownTurn: boolean;
  dodging: boolean;
  disengaged: boolean;
  attack: CombatantAttackState | null;
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

export function turnTiles(kit: TurnKit, state: TurnState): TurnTile[] {
  const block = (spend: TurnSpend) =>
    spendBlock(spend, state.resources, state.ownTurn);
  const tiles = attackTiles(kit, state, block);
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
      level: null,
      image: null,
      icon: a.icon,
      use: { kind: 'action', action: a.action },
      block: block('action') ?? (already ? `${a.name} уже действует` : null),
    });
  }
  return tiles;
}

// Черта действует сама — её в сетке нет, как и неподготовленного заклинания (решение
// Михаила 2026-10-28: в блоке хода только то, что можно применить). Заклинание без
// свободной ячейки нужного круга — бледное, с причиной.
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
  if (prepared === false && spell && (level ?? 0) >= 1) return null;
  if (level !== null) parts.push(level === 0 ? 'заговор' : `${level} круг`);
  return {
    key: `ability:${id}`,
    group: spell ? 'spells' : 'abilities',
    name: ability.name,
    tip: parts.join(' · '),
    cost: spend,
    level,
    image: { id: ability.id, image: ability.image },
    icon: spell ? 'spell' : 'rune',
    use: { kind: 'ability', abilityId: id, slotMin },
    block:
      spend === null
        ? 'В бою так не применить'
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
