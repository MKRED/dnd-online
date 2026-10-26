import { Button, Code, Collapse, CopyButton, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface ErrorDetailsProps {
  text: string;
}

// Текст ошибки свёрнут: он нужен, только чтобы переслать его разработчику.
function ErrorDetails({ text }: ErrorDetailsProps) {
  const [opened, { toggle }] = useDisclosure(false);
  return (
    <Stack gap="xs" align="flex-start">
      <Button variant="subtle" size="compact-sm" onClick={toggle}>
        {opened ? 'Скрыть текст ошибки' : 'Текст ошибки'}
      </Button>
      <Collapse expanded={opened} w="100%">
        <Stack gap="xs" align="flex-start">
          <Code block w="100%" style={{ whiteSpace: 'pre-wrap' }}>
            {text}
          </Code>
          <CopyButton value={text}>
            {({ copied, copy }) => (
              <Button variant="default" size="compact-sm" onClick={copy}>
                {copied ? 'Скопировано' : 'Скопировать'}
              </Button>
            )}
          </CopyButton>
        </Stack>
      </Collapse>
    </Stack>
  );
}

export default ErrorDetails;
