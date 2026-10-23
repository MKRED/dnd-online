// Проверочная карта набора: каждый предмет на своём креплении — на полу, на стене (за
// спиной ставится стена), под потолком (над ним — блок), в проёме (вокруг — стена).
// Сервер проверяет пересечения и опору — отказ значит, что модель или крепление заданы
// не так. Печатает id карты.
// Запуск: node scripts/furniture-kit/showroom.mjs <api> --set <набор> (--token … | --login … --password …)
import { client, parseArgs } from './api.mjs';
import { loadSet } from './sets.mjs';

const WIDTH = 48;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const kit = await loadSet(opts.set);
  const call = await client(opts);
  const list = await call('GET', '/furniture?scope=mine');
  const idOf = (name) => {
    const row = list.find((f) => f.name === name);
    if (!row) throw new Error(`Нет обстановки «${name}»`);
    return row.id;
  };

  const blocks = [];
  const places = [];
  let x = 1;
  let z = 2;
  let rowDepth = 0;
  for (const [name, mount, , look] of kit) {
    const build = Array.isArray(look) ? look[0][1] : look;
    const [w, h, d] = build().size;
    if (x + w + 1 > WIDTH) {
      x = 1;
      z += rowDepth + 3;
      rowDepth = 0;
    }
    let y = 1;
    if (mount === 'wall') {
      y = 2;
      blocks.push({ from: [x, 1, z + d], to: [x + w - 1, y + h, z + d] });
    } else if (mount === 'ceiling') {
      y = 2;
      blocks.push({ from: [x, y + h, z], to: [x + w - 1, y + h, z + d - 1] });
    } else if (mount === 'doorway') {
      blocks.push({ from: [x - 1, 1, z], to: [x - 1, h + 1, z] });
      blocks.push({ from: [x + w, 1, z], to: [x + w, h + 1, z] });
      blocks.push({ from: [x, h + 1, z], to: [x + w - 1, h + 1, z] });
    }
    places.push({ name, at: [x, y, z] });
    x += w + 2;
    rowDepth = Math.max(rowDepth, d + 1);
  }
  const depth = Math.min(z + rowDepth + 2, 256);

  const map = await call('POST', '/maps', {
    name: `Проверка: ${opts.set}`,
    width: WIDTH,
    depth,
  });
  const ops = (list) => call('POST', `/maps/${map.id}/ops`, { ops: list });
  await ops([
    {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [WIDTH - 1, 0, depth - 1],
      block: 'stone',
    },
    ...blocks.map((b) => ({ op: 'fillBox', ...b, block: 'stone' })),
  ]);
  for (const { name, at } of places) {
    try {
      await ops([
        {
          op: 'placeObject',
          at,
          object: { kind: 'furniture', furnitureId: idOf(name), facing: 0 },
        },
      ]);
    } catch (err) {
      console.log(`ОТКАЗ «${name}»: ${err.message}`);
    }
  }
  console.log(`карта ${map.id}, ${places.length} предметов`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
