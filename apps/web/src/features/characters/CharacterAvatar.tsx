import { Avatar, type AvatarProps } from '@mantine/core';
import type { CharacterMainImage } from 'shared';
import { useImageUrl } from '../../lib/useImageUrls';
import { characterImagePath } from './characterImagesApi';

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
    mainImage &&
      characterImagePath(
        characterId,
        mainImage.id,
        'thumb',
        mainImage.thumbVersion,
      ),
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
