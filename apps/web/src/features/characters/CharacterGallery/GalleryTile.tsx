import { ActionIcon, Badge, Loader, Menu, UnstyledButton } from '@mantine/core';
import type { CharacterImage } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import { characterImagePath } from '../characterImagesApi';
import classes from './CharacterGallery.module.css';
import { IconMore } from './galleryIcons';

interface GalleryTileProps {
  characterId: string;
  image: CharacterImage;
  // Порядковый номер для подписей: имён у картинок нет.
  number: number;
  busy: boolean;
  onOpen: () => void;
  onSetMain: () => void;
  onEditThumbnail: () => void;
  onRemove: () => void;
}

function GalleryTile({
  characterId,
  image,
  number,
  busy,
  onOpen,
  onSetMain,
  onEditThumbnail,
  onRemove,
}: GalleryTileProps) {
  const url = useImageUrl(characterImagePath(characterId, image.id, 'preview'));

  return (
    <div
      className={`${classes.tile} ${image.isMain ? classes.tileMain : ''}`}
      data-testid="gallery-tile"
    >
      <UnstyledButton
        className={classes.tileButton}
        onClick={onOpen}
        aria-label={`Открыть картинку ${number}`}
      >
        {url && <img className={classes.tileImage} src={url} alt="" />}
      </UnstyledButton>
      {(!url || busy) && (
        <div className={classes.tileCenter}>
          <Loader size="sm" />
        </div>
      )}
      {image.isMain && (
        <Badge className={classes.tileBadge} size="sm">
          Основная
        </Badge>
      )}
      {/* Меню видно всегда, а не по наведению: на телефоне наведения нет. */}
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            className={classes.tileMenu}
            variant="default"
            size="md"
            disabled={busy}
            aria-label={`Действия с картинкой ${number}`}
          >
            <IconMore />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={onOpen}>Открыть</Menu.Item>
          {image.isMain ? (
            <Menu.Item onClick={onEditThumbnail}>Изменить миниатюру</Menu.Item>
          ) : (
            <Menu.Item onClick={onSetMain}>Сделать основной</Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item color="red" onClick={onRemove}>
            Удалить
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}

export default GalleryTile;
