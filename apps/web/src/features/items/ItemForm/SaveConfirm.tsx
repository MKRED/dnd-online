import { Alert, Button, Group, Text } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { othersCharactersPhrase } from '../deleteConfirmText';
import type { SaveConfirmation, SaveFlags } from './saveConfirmation';

interface SaveConfirmProps {
  confirmation: SaveConfirmation;
  onConfirm: (flags: SaveFlags) => void;
  onCancel: () => void;
}

const list = (names: string[]) => names.map((name) => `«${name}»`).join(', ');

// Вопрос перед сохранением — у кнопок формы, чтобы ответ был там же, где нажали.
function SaveConfirm({ confirmation, onConfirm, onCancel }: SaveConfirmProps) {
  // Вопрос встаёт под длинной формой — прокручиваем к нему, иначе нажатие «Сохранить»
  // выглядит так, будто ничего не произошло.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [confirmation]);

  // «Закрыть», а не «Отмена»: рядом стоит «Отмена» формы, которая уводит со страницы.
  const cancel = (
    <Button variant="subtle" color="gray" onClick={onCancel}>
      Закрыть
    </Button>
  );

  if (confirmation.kind === 'publish') {
    return (
      <Alert ref={ref} color="yellow" title="В составе скрытые предметы">
        <Text size="sm">
          {list(confirmation.hiddenNames)} видите только вы. Набор можно
          опубликовать только вместе с ними.
        </Text>
        <Group gap="xs" mt="sm">
          <Button onClick={() => onConfirm({ publishContents: true })}>
            Опубликовать всё и сохранить
          </Button>
          {cancel}
        </Group>
      </Alert>
    );
  }

  const { ownPackNames, othersCount, othersCharactersCount } = confirmation;
  const inPacks = ownPackNames.length > 0 || othersCount > 0;
  return (
    <Alert
      ref={ref}
      color="yellow"
      title={
        inPacks
          ? 'Предмет лежит в опубликованных наборах'
          : 'Предмет лежит у чужих персонажей'
      }
    >
      {ownPackNames.length > 0 && (
        <Text size="sm">
          Ваши наборы: {list(ownPackNames)}. Если оставить их опубликованными,
          другие увидят в них строку «Предмет скрыт автором».
        </Text>
      )}
      {othersCount > 0 && (
        <Text size="sm">
          Чужих наборов: {othersCount}. В них другие увидят строку «Предмет
          скрыт автором».
        </Text>
      )}
      {othersCharactersCount > 0 && (
        <Text size="sm">
          Он лежит {othersCharactersPhrase(othersCharactersCount)}. У них он
          станет строкой «Предмет скрыт автором» и перестанет действовать на
          персонажа.
        </Text>
      )}
      <Group gap="xs" mt="sm">
        {ownPackNames.length > 0 ? (
          <>
            <Button onClick={() => onConfirm({ hidePacks: true })}>
              Скрыть и мои наборы
            </Button>
            <Button variant="default" onClick={() => onConfirm({})}>
              Скрыть только предмет
            </Button>
          </>
        ) : (
          <Button onClick={() => onConfirm({})}>Скрыть</Button>
        )}
        {cancel}
      </Group>
    </Alert>
  );
}

export default SaveConfirm;
