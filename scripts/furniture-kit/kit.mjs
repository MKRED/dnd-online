// Наборы обстановки (sets/*.mjs): модели и записи обстановки. Заводит их через REST
// API по имени: есть своя запись с таким названием — правит её (PUT), нет — создаёт.
// Запуск: node scripts/furniture-kit/kit.mjs <api> --set <набор>
//   (--token <токен> | --login <логин> --password <пароль>)
import { client, parseArgs } from './api.mjs';
import { loadSet } from './sets.mjs';

const SIGN = 'Создано Claude (ИИ).';

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
  const opts = parseArgs(process.argv.slice(2));
  const KIT = await loadSet(opts.set);
  const call = await client(opts);
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
