import { Button, Card, Stack, Text } from '@mantine/core';

interface FreeSeatCardProps {
  // Кнопка — только тому, кто может сесть: не мастеру и не тому, кто уже на месте.
  canTake: boolean;
  onTake: () => void;
}

function FreeSeatCard({ canTake, onTake }: FreeSeatCardProps) {
  return (
    <Card
      withBorder
      radius="md"
      p="md"
      style={{ borderStyle: 'dashed', background: 'transparent' }}
    >
      <Stack align="center" justify="center" gap="xs" h="100%" mih={88}>
        <Text c="dimmed">Свободное место</Text>
        {canTake && (
          <Button size="xs" variant="light" onClick={onTake}>
            Занять
          </Button>
        )}
      </Stack>
    </Card>
  );
}

export default FreeSeatCard;
