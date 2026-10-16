import { Text } from '@mantine/core';

// У «Запрета лечения» полей нет — в карточке только что он значит (docs/dnd/modifiers.md).
// Временные хиты по книге не лечение, их носитель получать может.
function NoHealingComponentFields() {
  return (
    <Text size="sm" c="dimmed">
      Носитель не восстанавливает хиты: лечение на него не действует. Временные
      хиты получать может.
    </Text>
  );
}

export default NoHealingComponentFields;
