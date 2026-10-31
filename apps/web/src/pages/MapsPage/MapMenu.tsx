import { ActionIcon, Menu } from '@mantine/core';
import { IconDots, IconPencil, IconTrash } from '@tabler/icons-react';

interface MapMenuProps {
  name: string;
  deleting: boolean;
  onRename: () => void;
  onDelete: () => void;
}

// «⋯» карточки карты: редкие действия убраны в меню, чтобы удалить случайно было трудно.
function MapMenu({ name, deleting, onRename, onDelete }: MapMenuProps) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Действия с картой «${name}»`}
          loading={deleting}
        >
          <IconDots size={18} stroke={1.75} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={onRename}>
          Переименовать
        </Menu.Item>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
        >
          Удалить
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default MapMenu;
