import { Alert, Anchor, List } from '@mantine/core';
import type { ErrorField } from './errorFields';

interface FormErrorSummaryProps {
  // «Персонаж не сохранён — исправьте поля»
  title: string;
  fields: ErrorField[];
  onPick: (path: string, from: Element) => void;
}

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

// Сводка стоит над кнопкой сохранения: форма длинная, и ошибка у поля в начале
// страницы не видна тому, кто нажал кнопку внизу.
function FormErrorSummary({ title, fields, onPick }: FormErrorSummaryProps) {
  return (
    <Alert color="red" title={title}>
      <List size="sm" spacing={4}>
        {fields.map(({ path, label, message }) => (
          <List.Item key={path}>
            <Anchor
              component="button"
              type="button"
              size="sm"
              onClick={(event) => onPick(path, event.currentTarget)}
            >
              {label}
            </Anchor>{' '}
            — {lowerFirst(message)}
          </List.Item>
        ))}
      </List>
    </Alert>
  );
}

export default FormErrorSummary;
