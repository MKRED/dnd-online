import {
  IconArmchair,
  IconBox,
  IconFlag,
  IconPaw,
  IconSword,
} from '@tabler/icons-react';
import type { ObjectChoice } from './placeChoice';

// Значок вида объекта в окне «Что поставить» и в панели (этап 10).
function ChoiceIcon({ choice, size }: { choice: ObjectChoice; size: number }) {
  const props = { size, stroke: 1.5 };
  switch (choice.kind) {
    case 'start':
      return <IconFlag {...props} />;
    case 'container':
      return <IconBox {...props} />;
    case 'creature':
      return <IconPaw {...props} />;
    case 'item':
      return <IconSword {...props} />;
    case 'furniture':
      return <IconArmchair {...props} />;
  }
}

export default ChoiceIcon;
