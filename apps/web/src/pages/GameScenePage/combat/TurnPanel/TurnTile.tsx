import { CatalogThumb, type ImagePathFn } from '../../../../features/catalog';
import GameIcon from './gameIcons';
import type { TurnTile as Tile } from './turnTiles';
import classes from './TurnPanel.module.css';

interface TurnTileProps {
  tile: Tile;
  selected: boolean;
  imagePath: ImagePathFn;
  onSelect: () => void;
  onHover: (tip: string | null) => void;
}

// Значок блока «Ваш ход» (вариант Г): картинка справочника или значок вида на сером, метка
// цены в углу (круг — действие, треугольник — бонусное, ромб — реакция), круг заклинания
// цифрой. Нельзя сейчас — бледный, но нажимается: строка снизу скажет почему.
function TurnTile({
  tile,
  selected,
  imagePath,
  onSelect,
  onHover,
}: TurnTileProps) {
  const picture = tile.image?.image ? tile.image : null;
  return (
    <button
      type="button"
      className={classes.tile}
      data-picture={picture ? true : undefined}
      data-blocked={tile.block ? true : undefined}
      aria-pressed={selected}
      aria-label={tile.block ? `${tile.name} — ${tile.block}` : tile.name}
      title={tile.name}
      onClick={onSelect}
      onMouseEnter={() => onHover(tile.tip)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(tile.tip)}
      onBlur={() => onHover(null)}
    >
      {picture ? (
        <CatalogThumb
          entry={{ ...picture, name: tile.name }}
          imagePath={imagePath}
        />
      ) : (
        <GameIcon name={tile.icon} />
      )}
      {tile.cost && tile.cost !== 'free' && (
        <i className={classes.cost} data-cost={tile.cost} />
      )}
      {tile.corner !== null && (
        <em className={classes.corner}>{tile.corner}</em>
      )}
    </button>
  );
}

export default TurnTile;
