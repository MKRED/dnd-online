// Проверочная карта: комната со стеной, дверью и воротами, вся обстановка набора на
// своих креплениях. Сервер проверяет пересечения и опору — отказ значит, что модель
// или крепление заданы не так.
// Запуск: node scripts/furniture-kit/showroom.mjs <api> (--token … | --login … --password …)
import { client, parseArgs } from './api.mjs';

async function main() {
  const call = await client(parseArgs(process.argv.slice(2)));
  const list = await call('GET', '/furniture?scope=mine');
  const id = (name) => {
    const row = list.find((f) => f.name === name);
    if (!row) throw new Error(`Нет обстановки «${name}»`);
    return row.id;
  };
  const map = await call('POST', '/maps', {
    name: 'Проверка обстановки',
    width: 24,
    depth: 24,
  });
  const ops = (list) => call('POST', `/maps/${map.id}/ops`, { ops: list });
  const place = (name, at, facing = 0) => ({
    op: 'placeObject',
    at,
    object: { kind: 'furniture', furnitureId: id(name), facing },
  });
  // Пол, стена по z = 12 с проёмами под дверь (x = 4) и ворота (x = 9…10), потолок
  // над люстрой.
  await ops([
    { op: 'fillBox', from: [0, 0, 0], to: [23, 0, 23], block: 'stone' },
    { op: 'fillBox', from: [0, 1, 12], to: [23, 3, 12], block: 'stone' },
    { op: 'fillBox', from: [4, 1, 12], to: [4, 2, 12], block: 'air' },
    { op: 'fillBox', from: [9, 1, 12], to: [10, 3, 12], block: 'air' },
    { op: 'fillBox', from: [14, 4, 5], to: [16, 4, 7], block: 'stone' },
  ]);
  await ops([
    place('Дверь', [4, 1, 12]),
    place('Ворота', [9, 1, 12]),
    place('Факел на стене', [2, 2, 11]),
    place('Факел на стене', [7, 2, 11]),
    place('Полка на стене', [13, 2, 11]),
    place('Книжный шкаф', [15, 1, 11]),
    place('Камин', [17, 1, 11]),
    place('Люстра', [15, 3, 6]),
    place('Стол', [2, 1, 5]),
    place('Стул', [2, 1, 6]),
    place('Длинный стол', [5, 1, 5]),
    place('Скамья', [5, 1, 4]),
    place('Скамья', [5, 1, 6], 180),
    place('Кровать', [20, 1, 2], 180),
    place('Сундук', [20, 1, 5]),
    place('Бочка', [1, 1, 1]),
    place('Ящик', [2, 1, 1]),
    place('Колонна', [12, 1, 8]),
    place('Ковёр', [14, 1, 5]),
    place('Костёр', [9, 1, 17]),
    place('Трон', [12, 1, 20], 180),
    place('Котёл', [5, 1, 17]),
    place('Алтарь', [11, 1, 22], 180),
  ]);
  // Ящик на столе: опора — верх стола.
  await ops([place('Ящик', [2, 2, 5])]);
  const summary = await call('GET', `/maps/${map.id}/summary`);
  console.log(map.id);
  console.log(typeof summary === 'string' ? summary : JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
