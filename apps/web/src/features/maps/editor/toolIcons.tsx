import {
  IconBox,
  IconBucketDroplet,
  IconCubePlus,
  IconEraser,
  IconEye,
  IconReplace,
  IconUsersGroup,
  IconWalk,
  type Icon,
} from '@tabler/icons-react';
import type { EditorTool } from './editorTools';

export const TOOL_ICONS: Record<EditorTool, Icon> = {
  view: IconEye,
  creatures: IconUsersGroup,
  place: IconCubePlus,
  erase: IconEraser,
  fill: IconBucketDroplet,
  hollow: IconBox,
  replace: IconReplace,
  walk: IconWalk,
};
