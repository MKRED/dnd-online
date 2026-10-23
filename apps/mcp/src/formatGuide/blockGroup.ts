import {
  BLOCK_ARMOR_CLASS_MAX,
  BLOCK_HIT_POINTS_MAX,
  HAZARD_NAMES,
  HAZARDS,
  hazardLabel,
  MATERIALS,
  SHAPE_LOOK_NAMES,
  SHAPE_NAMES,
  type BlockGroupFields,
  type BlockGroupInput,
} from 'shared';
import { fieldLines, list, sample } from './common.js';

const FIELDS = {
  name: 'название группы, до 100 символов; формы получат подписи «Название: ступени»',
  look: `базовый материал, чей узор рисуется, пока у группы нет своих текстур: ${list(Object.keys(MATERIALS))}`,
  color:
    'основной цвет #rrggbb: без своих текстур узор look перекрашивается в него; со своими — их средний цвет',
  textures:
    'null — узор look в цвете color; или {top, side, bottom} — плитки 16×16 RGBA строками сверху вниз в base64 (по 1024 байта), альфа 0 или 255. Обычно null: текстуры загружают в вебе',
  shapes: `свой вид отдельных форм: {форма: {textures, color}} — формы ${list(SHAPE_LOOK_NAMES)}, textures как выше (не null), color — средний цвет этих плиток; формы без записи рисуются текстурами группы. Обычно {}: рисуют в вебе`,
  opaque: 'перекрывает ли обзор (false — как стекло и листва)',
  durability: `{armorClass, hitPoints} — КД 1–${BLOCK_ARMOR_CLASS_MAX} и ХП 1–${BLOCK_HIT_POINTS_MAX} по таблице объектов (камень 17/27, дерево 15/27, стекло 13/11), или null — атаками не разрушается`,
  flammable: 'горит ли',
  movementCost: '1 — обычный шаг, 2 — труднопроходимая местность',
  climbable: 'можно ли лазать (пока у всех базовых false)',
  hazard: `null или урон тому, кто стоит на блоке: ${HAZARD_NAMES.map((name) => `${name} (${hazardLabel(HAZARDS[name])})`).join(', ')}`,
  description: 'описание',
  sources: 'источники — строки',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof BlockGroupInput, string>;

const EMBERS: BlockGroupFields = {
  look: 'scorched',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
  shapes: {},
};

export const blockGroupGuide = () => [
  'ГРУППА БЛОКОВ (kind block_group) — свой блок для карт: свойства для правил общие у всех форм',
  ...fieldLines(FIELDS),
  '',
  `Пример — тлеющие угли: ${sample(EMBERS)}`,
  '',
  'НА КАРТЕ',
  `- Ставить можно только свои группы (чужую сначала копируют). Имя блока в операциях карты — id группы для куба и «id_форма» для остальных форм: ${list(SHAPE_NAMES.filter((s) => s !== 'cube'))}.`,
  '- Свойства группы правила читают так же, как у базовых блоков; удалённая группа на картах становится пустотой.',
];
