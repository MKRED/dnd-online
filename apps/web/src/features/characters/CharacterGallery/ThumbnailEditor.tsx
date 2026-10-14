import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Slider,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import type { CharacterImage, ThumbCrop } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import { characterImagePath } from '../characterImagesApi';
import classes from './CharacterGallery.module.css';

const MAX_ZOOM = 5;

interface ThumbnailEditorProps {
  characterId: string;
  image: CharacterImage;
  saving: boolean;
  error: string | null;
  onSave: (crop: ThumbCrop) => void;
  onClose: () => void;
}

// Вырез из редактора — в целые пиксели картинки, строго внутри неё: редактор отдаёт
// дробные значения, а сервер вырез за краем отклонит.
function toThumbCrop(area: Area, image: CharacterImage): ThumbCrop {
  const size = Math.max(
    1,
    Math.min(
      Math.round(Math.min(area.width, area.height)),
      image.width,
      image.height,
    ),
  );
  const clamp = (value: number, limit: number) =>
    Math.min(Math.max(Math.round(value), 0), limit - size);
  return {
    x: clamp(area.x, image.width),
    y: clamp(area.y, image.height),
    size,
  };
}

// Выбор миниатюры: рамка стоит на месте, картинку под ней двигают и приближают.
// Компонент монтируют на время редактирования.
function ThumbnailEditor({
  characterId,
  image,
  saving,
  error,
  onSave,
  onClose,
}: ThumbnailEditorProps) {
  const url = useImageUrl(characterImagePath(characterId, image.id, 'full'));
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const { x, y, size } = image.thumbCrop;

  return (
    <Modal opened onClose={onClose} title="Миниатюра" size="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          Передвиньте картинку и приблизьте её — в рамке то, что станет
          миниатюрой.
        </Text>
        <div className={classes.cropStage}>
          {url ? (
            <Cropper
              image={url}
              crop={position}
              zoom={zoom}
              maxZoom={MAX_ZOOM}
              aspect={1}
              showGrid={false}
              // Редактор открывается на сохранённом вырезе, а не на центре.
              initialCroppedAreaPixels={{ x, y, width: size, height: size }}
              classes={{ cropAreaClassName: classes.cropArea }}
              onCropChange={setPosition}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          ) : (
            <Loader className={classes.cropLoader} />
          )}
        </div>
        <Slider
          label={null}
          // aria-label у Slider до ручки не доходит — подпись ручке задаёт thumbLabel.
          thumbLabel="Приближение"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={setZoom}
        />
        {error && (
          <Alert color="red" title="Ошибка">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button
            loading={saving}
            disabled={!area}
            onClick={() => area && onSave(toThumbCrop(area, image))}
          >
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ThumbnailEditor;
