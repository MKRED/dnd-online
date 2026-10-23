// Набор обстановки по имени файла в sets/: список [название, крепление, описание, модель
// или [[положение, модель], …]].
export async function loadSet(name) {
  if (!name) throw new Error('Нужно: --set <набор из sets/>');
  return (await import(`./sets/${name}.mjs`)).default;
}
