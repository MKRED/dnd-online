import { Alert, Avatar, Loader, Stack, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import type { CharacterImage } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import { characterImagePath } from '../characterImagesApi';
import { GalleryLightbox, useCharacterImages } from '../CharacterGallery';
import classes from './CharacterSheet.module.css';

interface SheetImagesProps {
  characterId: string;
  characterName: string;
}

function StripTile({
  characterId,
  image,
  number,
  onOpen,
}: {
  characterId: string;
  image: CharacterImage;
  number: number;
  onOpen: () => void;
}) {
  const url = useImageUrl(characterImagePath(characterId, image.id, 'preview'));
  return (
    <UnstyledButton
      className={classes.stripTile}
      onClick={onOpen}
      aria-label={`Открыть картинку ${number}`}
    >
      {url && <img src={url} alt="" />}
    </UnstyledButton>
  );
}

// Портрет (основная картинка) и остальные картинки полосой миниатюр; любая открывается
// на весь экран. Только просмотр: правки галереи — на странице редактирования.
function SheetImages({ characterId, characterName }: SheetImagesProps) {
  const { images, loadError } = useCharacterImages(characterId);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const mainIndex = images?.findIndex((image) => image.isMain) ?? -1;
  const main = images?.[mainIndex];
  const mainUrl = useImageUrl(
    main ? characterImagePath(characterId, main.id, 'preview') : null,
  );

  if (loadError) {
    return (
      <Alert color="red" title="Ошибка">
        {loadError}
      </Alert>
    );
  }
  if (!images) return <Loader />;

  return (
    <Stack gap="xs">
      {!main ? (
        <Avatar
          name={characterName}
          color="initials"
          size={160}
          radius="md"
          mx="auto"
        />
      ) : mainUrl ? (
        <UnstyledButton
          className={classes.portraitButton}
          onClick={() => setOpenIndex(mainIndex)}
          aria-label="Открыть основную картинку"
        >
          <img
            className={classes.portrait}
            src={mainUrl}
            alt={`Портрет: ${characterName}`}
          />
        </UnstyledButton>
      ) : (
        <Loader />
      )}
      {images.length > 1 && (
        <div className={classes.strip}>
          {images.map((image, index) => (
            <StripTile
              key={image.id}
              characterId={characterId}
              image={image}
              number={index + 1}
              onOpen={() => setOpenIndex(index)}
            />
          ))}
        </div>
      )}
      {openIndex !== null && (
        <GalleryLightbox
          characterId={characterId}
          characterName={characterName}
          images={images}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </Stack>
  );
}

export default SheetImages;
