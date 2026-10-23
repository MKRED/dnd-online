import {
  IconBrush,
  IconColorPicker,
  IconCubePlus,
  IconEraser,
  IconGrid3x3,
  type Icon,
} from '@tabler/icons-react';
import type { VoxelTool } from './useVoxelEditor';

// Инструменты с клавишами по месту на клавиатуре (useKeyCodes, работают и в русской
// раскладке): B и E — как карандаш и ластик редактора текстур, I — пипетка там же.
export const VOXEL_TOOLS: {
  tool: VoxelTool;
  label: string;
  key: string;
  code: string;
  icon: Icon;
}[] = [
  {
    tool: 'place',
    label: 'Ставить — к грани, на которую указываете',
    key: 'B',
    code: 'KeyB',
    icon: IconCubePlus,
  },
  {
    tool: 'erase',
    label: 'Стирать',
    key: 'E',
    code: 'KeyE',
    icon: IconEraser,
  },
  {
    tool: 'paint',
    label: 'Красить поставленные',
    key: 'F',
    code: 'KeyF',
    icon: IconBrush,
  },
  {
    tool: 'picker',
    label: 'Пипетка',
    key: 'I',
    code: 'KeyI',
    icon: IconColorPicker,
  },
  {
    tool: 'cells',
    label: 'Свойства клеток для пути',
    key: 'C',
    code: 'KeyC',
    icon: IconGrid3x3,
  },
];
