import {
  CONTAINER_CAPACITY,
  CONTAINER_LOOK_LABELS,
  CREATURE_SIZES,
  FACINGS,
} from 'shared';

// Справка по объектам на карте — часть block_guide.
export function buildObjectGuide(): string[] {
  const looks = Object.entries(CONTAINER_LOOK_LABELS)
    .map(([look, label]) => `${look} (${label.toLowerCase()})`)
    .join(', ');
  const capacities = Object.entries(CONTAINER_CAPACITY)
    .map(([look, pounds]) => `${look} — ${pounds}`)
    .join(', ');
  const sizes = Object.entries(CREATURE_SIZES)
    .map(([size, { label, footprint }]) => {
      const cells = Math.ceil(footprint);
      return `${size} — ${label.toLowerCase()}, ${cells} × ${cells}`;
    })
    .join('; ');
  return [
    'ОБЪЕКТЫ НА КАРТЕ (те же apply_ops, отменяются вместе с блоками)',
    '- Виды: start — точка старта персонажа игрока; monster — монстр из каталога; npc — свой НПС; container — сундук или другой контейнер с предметами; item — предмет на полу. id монстров, предметов и НПС — из find_catalog.',
    '- at — клетка, где стоят ноги: на блоке уровня y объект ставится на y+1. Существо больше Среднего занимает квадрат, at — его северо-западная клетка. Квадраты по размеру: ' +
      `${sizes}. Весь квадрат должен быть внутри карты.`,
    `- facing (у start, monster, npc, container) — взгляд: ${FACINGS.join(', ')} градусов по часовой от севера; по умолчанию 0. Только для наглядности, на правила не влияет.`,
    '- placeObject {at, object}: object — {kind: "start", facing?}, {kind: "monster", monsterId, facing?}, {kind: "npc", characterId, size? (по умолчанию medium), facing?}, ' +
      `{kind: "container", name?, look? (${looks}), items?: [{itemId, quantity?}], facing?}, {kind: "item", itemId, quantity?}.`,
    `- Вместимость контейнера в фунтах по виду: ${capacities}. Правка, после которой предметы тяжелее, отклоняется; вес предмета (weight) — в find_catalog.`,
    '- Номер нового объекта приходит в ответе apply_ops (createdObjectIds); сослаться на объект, поставленный в той же пачке, нельзя — правь его следующим вызовом. Номера не переиспользуются.',
    '- moveObject {id, at}, turnObject {id, facing}, updateObject {id, object: только меняемые поля}, removeObject {id}. Вид объекта не меняется: убери и поставь новый.',
    '- hidden: true (у объекта любого вида, в placeObject и updateObject) — скрыт от игроков: засада или спрятанный сундук. В игре такой объект видит только мастер; в map_summary он помечен hidden.',
    '- Уникальный монстр (role unique) бывает на карте только один. Чужого скрытого монстра или предмет и чужих НПС поставить нельзя.',
    '- Объекты не мешают блокам: блок можно поставить в клетку объекта. Проверяй map_summary — там у каждого объекта подпись и предупреждения («нельзя стоять», «висит в воздухе», «за границей карты», заглушка удалённого из каталога).',
    '- resize двигает объекты вместе с блоками; срезанные удаляются или остаются за границей, как блоки.',
  ];
}
