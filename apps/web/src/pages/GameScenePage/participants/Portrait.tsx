import { useImageUrl } from '../../../lib/useImageUrls';
import type { ParticipantKind } from './ParticipantRow';
import classes from './participants.module.css';

interface PortraitProps {
  // Путь миниатюры в API; null — картинки нет, вместо неё буква.
  image: string | null;
  name: string;
  kind: ParticipantKind;
  size?: number;
}

// Портрет участника (пользователь, 2026-10-24: картинки, а не буквы): та же миниатюра, что
// на карточке на сцене, в рамке цвета вида. Без картинки — первая буква имени.
function Portrait({ image, name, kind, size = 30 }: PortraitProps) {
  const url = useImageUrl(image);
  return (
    <span
      className={classes.avatar}
      data-kind={kind}
      data-image={url ? true : undefined}
      style={{ width: size, height: size, fontSize: size * 0.43 }}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" className={classes.avatarImage} />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export default Portrait;
