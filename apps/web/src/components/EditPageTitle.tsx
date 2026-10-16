import { Title, type MantineSpacing } from '@mantine/core';

interface EditPageTitleProps {
  // Название того, что правим; пока запись грузится — его нет.
  name?: string;
  mb?: MantineSpacing;
}

// Заголовок страницы правки: «Редактирование: <название>». Слово «Редактирование:»
// шрифтом h1 шире экрана телефона, поэтому на узком экране шрифт меньше. Слово, которое
// всё равно не влезает, переносится: по слогам, где у браузера есть русский словарь
// (у страницы lang="ru"), иначе где угодно — лишь бы страница не стала шире экрана.
function EditPageTitle({ name, mb }: EditPageTitleProps) {
  return (
    <Title
      order={1}
      miw={0}
      mb={mb}
      style={{
        fontSize: 'min(var(--mantine-h1-font-size), 6.5vw)',
        hyphens: 'auto',
        overflowWrap: 'anywhere',
      }}
    >
      {name ? `Редактирование: ${name}` : 'Редактирование'}
    </Title>
  );
}

export default EditPageTitle;
