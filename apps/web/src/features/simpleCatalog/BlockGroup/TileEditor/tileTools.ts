import {
  IconBucketDroplet,
  IconColorPicker,
  IconEraser,
  IconPencil,
  type Icon,
} from '@tabler/icons-react';
import type { TileTool } from './useTileEditor';

// Инструменты с клавишами: буквы по месту на клавиатуре (useKeyCodes), как в
// редакторах картинок — B, G, I, E.
export const TILE_TOOLS: {
  tool: TileTool;
  label: string;
  key: string;
  code: string;
  icon: Icon;
}[] = [
  {
    tool: 'pencil',
    label: 'Карандаш',
    key: 'B',
    code: 'KeyB',
    icon: IconPencil,
  },
  {
    tool: 'fill',
    label: 'Заливка',
    key: 'G',
    code: 'KeyG',
    icon: IconBucketDroplet,
  },
  {
    tool: 'picker',
    label: 'Пипетка',
    key: 'I',
    code: 'KeyI',
    icon: IconColorPicker,
  },
  {
    tool: 'eraser',
    label: 'Ластик — дыра насквозь',
    key: 'E',
    code: 'KeyE',
    icon: IconEraser,
  },
];
