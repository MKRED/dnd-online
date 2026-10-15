import {
  Alert,
  Button,
  Group,
  Modal,
  Slider,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { catalogThumbCropError, type ThumbCrop } from 'shared';
import classes from './ItemForm.module.css';

const MAX_ZOOM = 5;
// Насколько можно отдалить сверх «картинка целиком в рамке»: немного полей вокруг.
// Сервер разрешает вырез до двух длинных сторон, 0.8 даёт 1,25 — с запасом.
const ZOOM_OUT_MARGIN = 0.8;

interface ItemThumbEditorProps {
  src: string;
  // Размеры картинки в тех же пикселях, что и вырез.
  width: number;
  height: number;
  crop: ThumbCrop;
  onSave: (crop: ThumbCrop) => void;
  onClose: () => void;
}

// Вырез редактора — в целые пиксели. Позиция не ограничена краями картинки
// (restrictPosition={false}), поэтому x и y бывают отрицательными, а размер — больше
// картинки: поля миниатюры будут прозрачными.
function toThumbCrop(area: Area): ThumbCrop {
  return {
    x: Math.round(area.x),
    y: Math.round(area.y),
    size: Math.max(1, Math.round(Math.max(area.width, area.height))),
  };
}

// Выбор миниатюры: рамка стоит на месте, картинку двигают, приближают и отдаляют.
// Компонент монтируют на время редактирования.
function ItemThumbEditor({
  src,
  width,
  height,
  crop,
  onSave,
  onClose,
}: ItemThumbEditorProps) {
  // При zoom = 1 рамка равна короткой стороне картинки; чтобы картинка влезла
  // целиком, её надо отдалить до короткая/длинная.
  const minZoom =
    (Math.min(width, height) / Math.max(width, height)) * ZOOM_OUT_MARGIN;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const next = area && toThumbCrop(area);
  const error = next && catalogThumbCropError(next, width, height);

  return (
    <Modal opened onClose={onClose} title="Миниатюра" size="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          Передвиньте картинку, приблизьте или отдалите её — в рамке то, что
          станет миниатюрой. Поля вокруг картинки останутся прозрачными.
        </Text>
        <div className={classes.cropStage}>
          <Cropper
            image={src}
            crop={position}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={MAX_ZOOM}
            aspect={1}
            restrictPosition={false}
            // По умолчанию (contain) рамка равна короткой стороне картинки на экране —
            // у длинного меча это узкая полоска. cover растягивает картинку на всю
            // область, и рамка получается во всю её высоту.
            objectFit="cover"
            showGrid={false}
            // Редактор открывается на текущем вырезе, а не на центре.
            initialCroppedAreaPixels={{
              x: crop.x,
              y: crop.y,
              width: crop.size,
              height: crop.size,
            }}
            onCropChange={setPosition}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        </div>
        <Slider
          label={null}
          // aria-label у Slider до ручки не доходит — подпись ручке задаёт thumbLabel.
          thumbLabel="Приближение"
          min={minZoom}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={setZoom}
        />
        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!next || Boolean(error)}
            onClick={() => next && onSave(next)}
          >
            Готово
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ItemThumbEditor;
