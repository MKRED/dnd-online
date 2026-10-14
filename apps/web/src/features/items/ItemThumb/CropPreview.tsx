import type { ThumbCrop } from 'shared';
import classes from './ItemThumb.module.css';

interface CropPreviewProps {
  src: string;
  // Размеры картинки в тех же пикселях, что и вырез.
  width: number;
  height: number;
  crop: ThumbCrop;
}

// Как будет выглядеть миниатюра, пока она не сохранена: картинка ставится в квадрат так,
// что в нём виден ровно вырез. Вырез может выходить за края — там остаётся фон, как
// прозрачные поля настоящей миниатюры.
function CropPreview({ src, width, height, crop }: CropPreviewProps) {
  const percent = (value: number) => `${(value / crop.size) * 100}%`;
  return (
    <div className={classes.box}>
      <img
        className={classes.cropImage}
        src={src}
        alt=""
        style={{
          width: percent(width),
          height: percent(height),
          left: percent(-crop.x),
          top: percent(-crop.y),
        }}
      />
    </div>
  );
}

export default CropPreview;
