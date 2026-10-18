import { Alert, Button, Group, Text } from '@mantine/core';
import { useEffect, useRef } from 'react';
import type { SaveConfirmation, SaveFlags } from './saveConfirmation';

interface SaveConfirmProps {
  confirmation: SaveConfirmation;
  onConfirm: (flags: SaveFlags) => void;
  onCancel: () => void;
}

// Вопрос перед сохранением — у кнопок формы, чтобы ответ был там же, где нажали. Как у
// предметов (items/ItemForm/SaveConfirm.tsx).
function SaveConfirm({ confirmation, onConfirm, onCancel }: SaveConfirmProps) {
  // Вопрос встаёт под длинной формой — прокручиваем к нему, иначе нажатие «Сохранить»
  // выглядит так, будто ничего не произошло.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [confirmation]);

  return (
    <Alert ref={ref} color="yellow" title={confirmation.title}>
      {confirmation.lines.map((line) => (
        <Text key={line} size="sm">
          {line}
        </Text>
      ))}
      <Group gap="xs" mt="sm">
        {confirmation.actions.map((action, index) => (
          <Button
            key={action.label}
            variant={index === 0 ? 'filled' : 'default'}
            onClick={() => onConfirm(action.flags)}
          >
            {action.label}
          </Button>
        ))}
        {/* «Закрыть», а не «Отмена»: рядом «Отмена» формы, которая уводит со страницы. */}
        <Button variant="subtle" color="gray" onClick={onCancel}>
          Закрыть
        </Button>
      </Group>
    </Alert>
  );
}

export default SaveConfirm;
