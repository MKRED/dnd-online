import { Anchor, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { BlockGroupInfo } from 'shared';
import BlockTile from './BlockTile';
import PickerSection from './PickerSection';

interface OwnBlocksSectionProps {
  groups: BlockGroupInfo[];
  // Выбранный ряд окна: id группы или имя материала.
  selected: string;
  onChoose: (groupId: string) => void;
  onPickSameShape: (groupId: string) => void;
}

// «Мои блоки» в окне выбора (docs/plan/blocks.md, этап 6а): свои группы владельца
// карты, как материалы — клик показывает формы группы, двойной клик берёт её в той же
// форме. Своих нет — подсказка, где их сделать: справочник открывается в новой
// вкладке, чтобы не уходить с карты, а новый блок появится после обновления страницы.
function OwnBlocksSection({
  groups,
  selected,
  onChoose,
  onPickSameShape,
}: OwnBlocksSectionProps) {
  if (!groups.length)
    return (
      <Stack gap={2}>
        <Text size="sm" fw={500}>
          Мои блоки
        </Text>
        <Text size="xs" c="dimmed">
          Своих блоков пока нет.{' '}
          <Anchor component={Link} to="/blocks/new" target="_blank" size="xs">
            Создать в справочнике
          </Anchor>{' '}
          — новый блок появится здесь после обновления страницы.
        </Text>
      </Stack>
    );
  return (
    <PickerSection title="Мои блоки">
      {groups.map((group) => (
        <BlockTile
          key={group.id}
          block={group.id}
          label={group.name}
          selected={group.id === selected}
          onClick={() => onChoose(group.id)}
          onDoubleClick={() => onPickSameShape(group.id)}
        />
      ))}
    </PickerSection>
  );
}

export default OwnBlocksSection;
