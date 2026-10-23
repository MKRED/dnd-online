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
    '- Виды: start — точка старта персонажа игрока; monster — монстр из каталога; npc — свой НПС; container — сундук или другой контейнер с предметами; item — предмет на полу; furniture — своя обстановка (стол, статуя, картина). id монстров, предметов, НПС и обстановки — из find_catalog.',
    '- at — клетка, где стоят ноги: на блоке уровня y объект ставится на y+1. Существо больше Среднего занимает квадрат, at — его северо-западная клетка. Квадраты по размеру: ' +
      `${sizes}. Весь квадрат должен быть внутри карты.`,
    `- facing (у start, monster, npc, container) — взгляд: ${FACINGS.join(', ')} градусов по часовой от севера; по умолчанию 0. Только для наглядности, на правила не влияет.`,
    '- placeObject {at, object}: object — {kind: "start", facing?}, {kind: "monster", monsterId, facing?}, {kind: "npc", characterId, size? (по умолчанию medium), facing?}, ' +
      `{kind: "container", name?, look? (${looks}), items?: [{itemId, quantity?}], facing?}, {kind: "item", itemId, quantity?}, {kind: "furniture", furnitureId, facing?}.`,
    `- Вместимость контейнера в фунтах по виду: ${capacities}. Правка, после которой предметы тяжелее, отклоняется; вес предмета (weight) — в find_catalog.`,
    '- Номер нового объекта приходит в ответе apply_ops (createdObjectIds); сослаться на объект, поставленный в той же пачке, нельзя — правь его следующим вызовом. Номера не переиспользуются.',
    '- moveObject {id, at}, turnObject {id, facing}, updateObject {id, object: только меняемые поля}, removeObject {id}. Вид объекта не меняется: убери и поставь новый.',
    '- hidden: true (у объекта любого вида, в placeObject и updateObject) — скрыт от игроков: засада или спрятанный сундук. В игре такой объект видит только мастер; в map_summary он помечен hidden.',
    '- Уникальный монстр (role unique) стоит на карте в одном экземпляре: второго такого же не поставить, а разные уникальные можно. Чужого скрытого монстра или предмет и чужих НПС поставить нельзя.',
    ...furnitureLines(),
    '- Остальные объекты блокам не мешают: блок можно поставить в их клетку. Проверяй map_summary — там у каждого объекта подпись и предупреждения («нельзя стоять», «висит в воздухе», «за границей карты», заглушка удалённого из каталога).',
    '- resize двигает объекты вместе с блоками; срезанные удаляются или остаются за границей, как блоки.',
  ];
}

// Обстановка на карте (docs/plan/blocks.md, этап 8в): место по модели и строгие проверки.
function furnitureLines(): string[] {
  return [
    'ОБСТАНОВКА (kind furniture)',
    '- Занимает коробку клеток размера своей модели (modelSize [x, y, z] из find_catalog); at — её северо-западная нижняя клетка. При facing 90 и 270 ширина и глубина меняются местами. «Вперёд» модели при facing 0 — север, поворот — по часовой.',
    '- facing — только 0, 90, 180 или 270: 45° сервер отклонит.',
    '- Проверки места: в клетках коробки нет блоков и других объектов. floor — под каждой нижней клеткой опора: блок с верхом во всю клетку (на блоке уровня y — at.y = y+1) или клетка другой обстановки «можно встать сверху» (свеча на столе). wall — за спиной (сторона против «вперёд») у каждой клетки спины блок: при facing 0 спина — юг, и картина висит на южной стене комнаты лицом на север; на северной стене — facing 180. ceiling — над каждой верхней клеткой блок.',
    '- force: true в placeObject, moveObject, turnObject или updateObject ставит без этих проверок (как Shift+клик в редакторе). Предупреждений о месте обстановки в map_summary нет: без force она и стоит как надо, с force — проверяй сам.',
    '- Обстановка мешает блокам: fillBox, hollowBox и replace обходят её клетки, setBlock в её клетку отклоняется — сначала убери её (воздух ставится везде).',
    '- В правилах клетки модели: препятствие, труднопроходимо, свободно или «можно встать сверху» (стол); укрытие и обзор — по самим вокселям. Обстановка на стене и потолке пути не мешает.',
  ];
}
