import { Fragment, type ReactNode } from 'react';
import type { ImagePathFn } from '../../../../features/catalog';
import TurnTileButton from './TurnTile';
import { slotDots } from './slotsLine';
import type { SpellLevel } from './spellLevels';
import { TILE_GROUP_LABELS, type TileGroup, type TurnTile } from './turnTiles';
import classes from './TurnPanel.module.css';

const GROUPS: TileGroup[] = ['attacks', 'spells', 'abilities', 'actions'];

interface TurnGroupsProps {
  tiles: readonly TurnTile[];
  // Заклинания по кругам — те же значки группы «Заклинания».
  levels: readonly SpellLevel[];
  chosen: string | null;
  onChoose: (key: string | null) => void;
  onHover: (tip: string | null) => void;
  itemImage: ImagePathFn;
  abilityImage: ImagePathFn;
  // Справа от заголовка «Атаки»: переключатель набора оружия.
  attacksHead?: ReactNode;
}

// Сетка блока «Ваш ход»: Атаки, Заклинания подгруппами по кругам со свободными ячейками у
// заголовка, Умения, Действия. Нажатый значок нажимается снова — выбор снят.
function TurnGroups({
  tiles,
  levels,
  chosen,
  onChoose,
  onHover,
  itemImage,
  abilityImage,
  attacksHead,
}: TurnGroupsProps) {
  const row = (own: readonly TurnTile[], imagePath: ImagePathFn) => (
    <div className={classes.tiles}>
      {own.map((tile) => (
        <TurnTileButton
          key={tile.key}
          tile={tile}
          selected={tile.key === chosen}
          imagePath={imagePath}
          onSelect={() => onChoose(tile.key === chosen ? null : tile.key)}
          onHover={onHover}
        />
      ))}
    </div>
  );
  return GROUPS.map((group) => {
    const own = tiles.filter((t) => t.group === group);
    if (own.length === 0) return null;
    return (
      <div key={group} className={classes.group}>
        {group === 'attacks' && attacksHead ? (
          <div className={classes.groupHead}>
            <span className={classes.groupLabel}>
              {TILE_GROUP_LABELS[group]}
            </span>
            {attacksHead}
          </div>
        ) : (
          <span className={classes.groupLabel}>{TILE_GROUP_LABELS[group]}</span>
        )}
        {group === 'spells'
          ? levels.map((level) => (
              <Fragment key={level.level ?? 'none'}>
                <LevelLabel level={level} />
                {row(level.tiles, abilityImage)}
              </Fragment>
            ))
          : row(own, group === 'attacks' ? itemImage : abilityImage)}
      </div>
    );
  });
}

function LevelLabel({ level }: { level: SpellLevel }) {
  const dots = slotDots(level.slot);
  const free = level.slot
    ? Math.max(0, level.slot.total - level.slot.expended)
    : 0;
  return (
    <span className={classes.level}>
      {level.label}
      {dots && level.slot && (
        <span
          className={classes.dots}
          aria-label={`ячейки: свободно ${free} из ${level.slot.total}`}
        >
          {dots}
        </span>
      )}
    </span>
  );
}

export default TurnGroups;
