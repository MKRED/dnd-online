import type { UseFormReturnType } from '@mantine/form';

// Поля секций читают/пишут значение напрямую в DOM (mode: 'uncontrolled' в
// CharacterCreatePage) — им не нужно перерисовываться на изменение form.values.
// Но сам объект `form`, который возвращает useForm, создаётся заново на каждый
// рендер, и Mantine форсирует один настоящий React-рендер CharacterCreatePage при
// первом же изменении ЛЮБОГО поля (переход dirty false→true, см. setCalculatedFieldDirty
// в @mantine/form) — без этого сравнения он бы каскадом перерисовывал все секции.
// Единственное, что реально должно перерисовывать секцию, — ошибки валидации.
//
// form.errors нельзя сравнивать по ссылке: insertListItem/removeListItem (добавление
// и удаление строки класса) внутри Mantine безусловно пересобирают объект errors
// новым {...errors} даже когда ошибок нет и содержимое не меняется — по ссылке это
// всегда "изменилось", что сводило на нет мемоизацию именно на добавлении/удалении
// класса. Сравниваем по содержимому: ключей немного, значения — примитивы (строки).
function shallowRecordEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export function formErrorsEqual<Values>(
  prev: { form: UseFormReturnType<Values> },
  next: { form: UseFormReturnType<Values> },
): boolean {
  return shallowRecordEqual(prev.form.errors, next.form.errors);
}
