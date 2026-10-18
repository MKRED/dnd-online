import type { ReactNode } from 'react';
import type { Bookmark } from 'shared';
import { CatalogThumb, type ImagePathFn } from '../../features/catalog';
import { CharacterAvatar } from '../../features/characters';
import { itemImagePath } from '../../features/items';
import { ABILITIES, EFFECTS } from '../../features/simpleCatalog';

// Адрес и миниатюра цели закладки. Здесь, а не в features/bookmarks: страницы целей сами
// показывают звёздочку из bookmarks, и обратный импорт замкнул бы модули в круг.
const CATALOG: Record<
  Exclude<Bookmark['kind'], 'character'>,
  { path: string; imagePath: ImagePathFn }
> = {
  item: { path: '/items', imagePath: itemImagePath },
  ability: { path: ABILITIES.path, imagePath: ABILITIES.api.imagePath },
  effect: { path: EFFECTS.path, imagePath: EFFECTS.api.imagePath },
};

export function bookmarkTargetView(bookmark: Bookmark): {
  to: string;
  thumb: ReactNode;
} {
  const id = bookmark.targetId;
  if (bookmark.kind === 'character') {
    return {
      to: `/characters/${id}`,
      thumb: bookmark.target && (
        <CharacterAvatar
          characterId={id}
          name={bookmark.target.name}
          mainImage={bookmark.target.mainImage}
          size={40}
        />
      ),
    };
  }
  const { path, imagePath } = CATALOG[bookmark.kind];
  return {
    to: `${path}/${id}`,
    thumb: bookmark.target && (
      <CatalogThumb
        entry={{ id, name: bookmark.target.name, image: bookmark.target.image }}
        imagePath={imagePath}
        placeholderSize="1rem"
      />
    ),
  };
}
