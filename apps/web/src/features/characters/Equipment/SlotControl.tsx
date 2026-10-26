import { Drawer, Popover } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { ReactNode } from 'react';
import SlotButton from './SlotButton';
import type { ComponentProps } from 'react';

interface SlotControlProps {
  button: Omit<ComponentProps<typeof SlotButton>, 'active' | 'onClick'>;
  title: string;
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}

// Место куклы с выбором вещи: на широком экране — всплывающий список у места, на
// телефоне — шторка снизу (вариант А макета).
function SlotControl({
  button,
  title,
  opened,
  onOpen,
  onClose,
  children,
}: SlotControlProps) {
  const wide = useMediaQuery('(min-width: 48em)', true);
  const toggle = () => (opened ? onClose() : onOpen());

  if (!wide) {
    return (
      <>
        <SlotButton {...button} active={opened} onClick={toggle} />
        <Drawer
          opened={opened}
          onClose={onClose}
          position="bottom"
          // Высота по содержимому: список вещей обычно короткий.
          styles={{ content: { height: 'auto', maxHeight: '80dvh' } }}
          title={title}
          radius="md"
        >
          {children}
        </Drawer>
      </>
    );
  }
  return (
    <Popover
      opened={opened}
      onDismiss={onClose}
      position="bottom-start"
      width={300}
      shadow="md"
      withinPortal
      trapFocus
      returnFocus
    >
      <Popover.Target>
        <SlotButton {...button} active={opened} onClick={toggle} />
      </Popover.Target>
      <Popover.Dropdown aria-label={title}>{children}</Popover.Dropdown>
    </Popover>
  );
}

export default SlotControl;
