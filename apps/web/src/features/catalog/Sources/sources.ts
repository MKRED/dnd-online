// Источники в форме: строки как ввели. В запрос — без пробелов по краям и без пустых
// строк: пустое поле значит «передумал», ошибкой его не считаем.
export const toSourcesInput = (sources: readonly string[]) =>
  sources.map((source) => source.trim()).filter((source) => source !== '');
