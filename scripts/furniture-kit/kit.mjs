// Базовый набор обстановки: модели и записи обстановки. Заводит их через REST API —
// по имени: есть своя запись с таким названием — правит её (PUT), нет — создаёт.
// Запуск: node scripts/furniture-kit/kit.mjs <api> (--token <токен> | --login <логин> --password <пароль>)
import { client, parseArgs } from './api.mjs';
import * as M from './models.mjs';

const SIGN = 'Создано Claude (ИИ).';

// mount, описание и модели; у вещи с положениями модели идут по положениям.
const KIT = [
  [
    'Стол',
    'floor',
    'Деревянный стол на четырёх ножках. На него можно встать.',
    M.table,
  ],
  [
    'Длинный стол',
    'floor',
    'Стол на две клетки для трактира или пиршественного зала. На него можно встать.',
    M.longTable,
  ],
  [
    'Стул',
    'floor',
    'Деревянный стул со спинкой. Клетка труднопроходима.',
    M.chair,
  ],
  ['Скамья', 'floor', 'Скамья на две клетки. На неё можно встать.', M.bench],
  [
    'Кровать',
    'floor',
    'Кровать с подушкой и одеялом, изголовье у спины. Клетки труднопроходимы.',
    M.bed,
  ],
  [
    'Сундук',
    'floor',
    'Окованный сундук. Закрытый — на него можно встать; открытый — с монетами внутри и откинутой крышкой.',
    [
      ['Закрыт', M.chestClosed],
      ['Открыт', M.chestOpen],
    ],
  ],
  ['Бочка', 'floor', 'Бочка с железными обручами. Препятствие.', M.barrel],
  ['Ящик', 'floor', 'Деревянный ящик. На него можно встать.', M.crate],
  [
    'Книжный шкаф',
    'floor',
    'Шкаф с книгами высотой в две клетки, ставится спиной к стене. Препятствие.',
    M.bookcase,
  ],
  [
    'Факел на стене',
    'wall',
    'Горящий факел в железном держателе. Вешается на стену.',
    M.torch,
  ],
  [
    'Полка на стене',
    'wall',
    'Настенная полка с бутылками, книгой и свечой.',
    M.wallShelf,
  ],
  [
    'Люстра',
    'ceiling',
    'Железная люстра со свечами на цепи. Вешается под потолок.',
    M.chandelier,
  ],
  [
    'Колонна',
    'floor',
    'Каменная колонна высотой в три клетки с базой и капителью. Препятствие.',
    M.column,
  ],
  [
    'Дверь',
    'doorway',
    'Деревянная дверь в проём шириной в клетку и высотой в две. Открытая прижата к боковой грани и не мешает пройти.',
    [
      ['Закрыта', M.doorClosed],
      ['Открыта', M.doorOpen],
    ],
  ],
  [
    'Ворота',
    'doorway',
    'Окованные двустворчатые ворота в проём 2 × 3 клетки. Открытые створки стоят у краёв проёма.',
    [
      ['Закрыты', M.gateClosed],
      ['Открыты', M.gateOpen],
    ],
  ],
  [
    'Ковёр',
    'floor',
    'Красный ковёр 2 × 3 клетки с золотым узором. Не мешает ходить.',
    M.rug,
  ],
  [
    'Костёр',
    'floor',
    'Костёр в кольце камней. Клетка труднопроходима.',
    M.campfire,
  ],
  [
    'Камин',
    'floor',
    'Каменный камин 2 × 2 клетки с огнём, ставится спиной к стене. Препятствие.',
    M.fireplace,
  ],
  [
    'Трон',
    'floor',
    'Резной трон с красной обивкой и высокой спинкой.',
    M.throne,
  ],
  [
    'Котёл',
    'floor',
    'Железный котёл на ножках с зелёным варевом. Препятствие.',
    M.cauldron,
  ],
  [
    'Алтарь',
    'floor',
    'Каменный алтарь на две клетки с покровом. На него можно встать.',
    M.altar,
  ],
];

// Список своих записей раздела по названию.
async function mine(call, path) {
  const list = await call('GET', `${path}?scope=mine`);
  const rows = Array.isArray(list) ? list : (list.items ?? list.data ?? []);
  return new Map(rows.map((row) => [row.name, row.id]));
}

async function upsert(call, path, existing, body) {
  const id = existing.get(body.name);
  const saved = id
    ? await call('PUT', `${path}/${id}`, body)
    : await call('POST', path, body);
  console.log(
    `${id ? 'обновлено' : 'создано'}: ${path} «${body.name}» ${saved.id}`,
  );
  return saved.id;
}

async function main() {
  const call = await client(parseArgs(process.argv.slice(2)));
  const models = await mine(call, '/voxel-models');
  const furniture = await mine(call, '/furniture');
  for (const [name, mount, text, look] of KIT) {
    const description = `${text}\n\n${SIGN}`;
    const variants = Array.isArray(look) ? look : [[null, look]];
    const positions = [];
    for (const [position, build] of variants) {
      const modelName = position ? `${name} — ${position.toLowerCase()}` : name;
      const modelId = await upsert(call, '/voxel-models', models, {
        name: modelName,
        description: `Модель для обстановки «${name}». ${SIGN}`,
        isPublic: false,
        ...build().fields(),
      });
      positions.push({ name: position, modelId });
    }
    await upsert(call, '/furniture', furniture, {
      name,
      description,
      isPublic: false,
      mount,
      modelId: positions[0].modelId,
      positions: positions[0].name ? positions : [],
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
