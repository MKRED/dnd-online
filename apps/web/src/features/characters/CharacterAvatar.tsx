import { Avatar, type AvatarProps } from '@mantine/core';
import type { CharacterMainImage } from 'shared';
import { useImageUrl } from './useImageUrls';

interface CharacterAvatarProps extends Pick<AvatarProps, 'size'> {
  characterId: string;
  name: string;
  mainImage: CharacterMainImage | null;
}

// Миниатюра основной картинки персонажа; пока картинок нет (или миниатюра грузится) —
// инициалы имени. Форма — квадрат со скруглёнными углами.
function CharacterAvatar({
  characterId,
  name,
  mainImage,
  size = 'lg',
}: CharacterAvatarProps) {
  const url = useImageUrl(
    mainImage && {
      characterId,
      imageId: mainImage.id,
      variant: 'thumb',
      version: mainImage.thumbVersion,
    },
  );
  return (
    <Avatar
      src={url ?? null}
      name={name}
      color="initials"
      alt={`Портрет: ${name}`}
      size={size}
      radius="md"
    />
  );
}

export default CharacterAvatar;
