import {
  IconBox,
  IconBucketDroplet,
  IconCubePlus,
  IconEraser,
  IconEye,
  IconReplace,
  IconWalk,
  type Icon,
} from '@tabler/icons-react';
import type { EditorTool } from './editorTools';

export const TOOL_ICONS: Record<EditorTool, Icon> = {
  view: IconEye,
  place: IconCubePlus,
  erase: IconEraser,
  fill: IconBucketDroplet,
  hollow: IconBox,
  replace: IconReplace,
  walk: IconWalk,
};
