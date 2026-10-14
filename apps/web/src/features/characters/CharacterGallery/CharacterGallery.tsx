import {
  Alert,
  Button,
  Fieldset,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import { CHARACTER_IMAGE_MAX_COUNT } from 'shared';
import CharacterAvatar from '../CharacterAvatar';
import classes from './CharacterGallery.module.css';
import GalleryLightbox from './GalleryLightbox';
import GalleryTile from './GalleryTile';
import ThumbnailEditor from './ThumbnailEditor';
import UploadTile from './UploadTile';
import { useCharacterImages } from './useCharacterImages';

interface CharacterGalleryProps {
  characterId: string;
  characterName: string;
}

// Галерея картинок персонажа на странице редактирования. Стоит вне формы чарника:
// картинки сохраняются сразу, а не кнопкой «Сохранить изменения».
function CharacterGallery({
  characterId,
  characterName,
}: CharacterGalleryProps) {
  const gallery = useCharacterImages(characterId);
  const { images } = gallery;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editingThumbnail, setEditingThumbnail] = useState(false);
  const main = images?.find((image) => image.isMain) ?? null;

  const handleRemove = (imageId: string) => {
    if (!window.confirm('Удалить картинку безвозвратно?')) return;
    void gallery.remove(imageId);
  };

  const openThumbnailEditor = () => {
    gallery.clearActionError();
    setEditingThumbnail(true);
  };

  return (
    <Fieldset legend="Картинки">
      <Stack gap="sm">
        {/* На узком экране миниатюра с кнопкой уходят под текст, а не сжимают его. */}
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed" className={classes.hint}>
            Картинки сохраняются сразу, отдельно от остальной формы. Основная
            картинка даёт персонажу миниатюру — она видна в списке персонажей.
          </Text>
          {main && (
            <Group gap="xs" wrap="nowrap">
              <CharacterAvatar
                characterId={characterId}
                name={characterName}
                mainImage={main}
                size="lg"
              />
              <Button variant="default" size="xs" onClick={openThumbnailEditor}>
                Изменить миниатюру
              </Button>
            </Group>
          )}
        </Group>

        {gallery.loadError ? (
          <Alert color="red" title="Ошибка">
            {gallery.loadError}
          </Alert>
        ) : !images ? (
          <Loader />
        ) : (
          <div className={classes.grid}>
            {images.map((image, index) => (
              <GalleryTile
                key={image.id}
                characterId={characterId}
                image={image}
                number={index + 1}
                busy={gallery.busyId === image.id}
                onOpen={() => setOpenIndex(index)}
                onSetMain={() => void gallery.setMain(image.id)}
                onEditThumbnail={openThumbnailEditor}
                onRemove={() => handleRemove(image.id)}
              />
            ))}
            {images.length < CHARACTER_IMAGE_MAX_COUNT ? (
              <UploadTile
                wide={images.length === 0}
                loading={gallery.uploadingCount > 0}
                onFiles={(files) => void gallery.upload(files)}
                onProblems={gallery.addProblems}
              />
            ) : (
              <Text size="sm" c="dimmed" className={classes.uploadTile}>
                В галерее {CHARACTER_IMAGE_MAX_COUNT} картинок — это предел
              </Text>
            )}
          </div>
        )}

        {gallery.problems.length > 0 && (
          <Alert
            color="red"
            title="Не все картинки добавлены"
            withCloseButton
            closeButtonLabel="Скрыть"
            onClose={gallery.clearProblems}
          >
            {gallery.problems.map((problem, index) => (
              <Text size="sm" key={`${problem.fileName}-${index}`}>
                {problem.fileName}: {problem.message}
              </Text>
            ))}
          </Alert>
        )}
        {gallery.actionError && !editingThumbnail && (
          <Alert
            color="red"
            title="Ошибка"
            withCloseButton
            closeButtonLabel="Скрыть"
            onClose={gallery.clearActionError}
          >
            {gallery.actionError}
          </Alert>
        )}
      </Stack>

      {images && openIndex !== null && (
        <GalleryLightbox
          characterId={characterId}
          characterName={characterName}
          images={images}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
      {main && editingThumbnail && (
        <ThumbnailEditor
          characterId={characterId}
          image={main}
          saving={gallery.busyId === main.id}
          error={gallery.actionError}
          onSave={(crop) => {
            void gallery.saveThumbCrop(main.id, crop).then((saved) => {
              if (saved) setEditingThumbnail(false);
            });
          }}
          onClose={() => setEditingThumbnail(false)}
        />
      )}
    </Fieldset>
  );
}

export default CharacterGallery;
