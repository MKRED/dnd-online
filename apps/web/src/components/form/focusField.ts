// Поле ищем в форме, где лежит from (кнопка или сам form), по data-path, который Mantine
// ставит на input через getInputProps. Прокручиваем в центр, а не к верхнему краю:
// иначе поле уходит под липкую шапку сайта.
export function focusField(from: Element, path: string) {
  const input = from
    .closest('form')
    ?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);
  if (!input) {
    console.error('Form field not found for error', path);
    return;
  }
  input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  // Без preventScroll фокус дёрнул бы страницу сразу, обрывая плавную прокрутку.
  input.focus({ preventScroll: true });
}
