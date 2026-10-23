import {
  ABILITY_CATEGORIES,
  EFFECT_COMPONENT_KINDS,
  EFFECT_COMPONENT_LABELS,
  effectComponentKinds,
  type Ability,
  type AbilityInput,
  type BlockGroup,
  type BlockGroupInput,
  type Effect,
  type EffectInput,
  type Furniture,
  type FurnitureInput,
  type VoxelModel,
  type VoxelModelInput,
} from 'shared';
import type { ComponentType } from 'react';
import { catalogApi, type CatalogSection } from '../catalog';
import {
  BLOCK_EXTRAS,
  BlockCopyPanel,
  BLOCK_KIND_LABELS,
  BLOCK_KINDS,
  blockKinds,
  loadBlockDeleteConfirm,
} from './BlockGroup';
import { effectDeleteConfirmText } from './deleteConfirmText';
import {
  FURNITURE_EXTRAS,
  FURNITURE_KIND_LABELS,
  FURNITURE_KINDS,
  FurnitureCopyPanel,
  furnitureKinds,
} from './Furniture';
import {
  MODEL_EXTRAS,
  MODEL_KIND_LABELS,
  MODEL_KINDS,
  ModelCopyPanel,
  loadModelDeleteConfirm,
  modelKinds,
} from './VoxelModel';
import {
  ABILITY_EXTRAS,
  EFFECT_EXTRAS,
  type CatalogExtras,
} from './catalogExtras';

// Запись простого каталога — способность, эффект (docs/plan/done/abilities-effects.md),
// группа блоков (docs/plan/blocks.md, этап 4), модель (этап 8а) или обстановка (этап
// 8б). Страницы у них одни; чем разделы отличаются — виды записей для чипов и бейджей
// (kinds) и свои поля раздела (extras).
export type SimpleEntry =
  Ability | Effect | BlockGroup | VoxelModel | Furniture;
export type SimpleInput =
  | AbilityInput
  | EffectInput
  | BlockGroupInput
  | VoxelModelInput
  | FurnitureInput;

// Действия раздела на карточке записи для всех, а не только для автора: у групп блоков —
// «Скопировать себе» и обновление копии (docs/plan/blocks.md, этап 6б). onChange —
// запись, которую сервер вернул после действия.
export interface CardActionsProps {
  entry: SimpleEntry;
  isAuthor: boolean;
  onChange: (entry: SimpleEntry) => void;
}

// Чем раздел справочника отличается от другого: адрес, запросы, категории и тексты
// (род у способности женский, у эффекта мужской).
export interface SimpleCatalogDef {
  section: Exclude<CatalogSection, 'items' | 'monsters'>;
  // Вид закладки на записи раздела (docs/plan/done/bookmarks.md). Нет — нет и звёздочки:
  // групп блоков в закладках пока нет.
  bookmarkKind?: 'ability' | 'effect';
  path: string;
  api: ReturnType<typeof catalogApi<SimpleEntry, SimpleInput>>;
  // Категории способности — выбор в форме. У эффекта категории нет.
  categories?: readonly string[];
  // Виды записей для чипов и бейджей: категория способности, составляющие эффекта
  // («Базовый» — эффект без составляющих). У записи их бывает несколько.
  kinds: {
    values: readonly string[];
    labels: Record<string, string>;
    of: (entry: SimpleEntry) => readonly string[];
  };
  // Круг заклинания для фильтра «Круг»; у остальных записей null. Нет — нет и фильтра.
  levelOf?: (entry: SimpleEntry) => number | null;
  // Свои поля раздела: составляющие, длительность и снятие спасброском у эффекта;
  // категория, активация и затраты у способности.
  extras: CatalogExtras;
  CardActions?: ComponentType<CardActionsProps>;
  // Тексты ошибок загрузки записи — один объект на раздел: useCatalogEntry ждёт
  // постоянный объект, иначе перезапускает загрузку.
  loadTexts: { notFound: string; failed: string };
  texts: {
    title: string;
    newTitle: string;
    createLabel: string;
    back: string;
    hidden: string;
    listFailed: string;
    saveFailed: string;
    deleteFailed: string;
    // «Способность сохранена, а картинка — нет»
    imageNotSaved: string;
    // Вопрос перед удалением; у групп блоков — после запроса, где стоят их блоки.
    deleteConfirm: (entry: SimpleEntry) => string | Promise<string>;
    namePlaceholder: string;
    publicHint: string;
    descriptionPlaceholder: string;
    empty: { mine: string; catalog: string };
  };
}

export const ABILITIES: SimpleCatalogDef = {
  section: 'abilities',
  bookmarkKind: 'ability',
  path: '/abilities',
  api: catalogApi<SimpleEntry, SimpleInput>('/abilities'),
  categories: ABILITY_CATEGORIES,
  kinds: {
    values: ABILITY_CATEGORIES,
    labels: { basic: 'Базовая', spell: 'Заклинание', monster: 'Монстра' },
    of: (entry) => ['category' in entry ? entry.category : 'basic'],
  },
  levelOf: (entry) =>
    'category' in entry && entry.category === 'spell'
      ? entry.details.level
      : null,
  extras: ABILITY_EXTRAS,
  loadTexts: {
    notFound: 'Способность не найдена',
    failed: 'Не удалось загрузить способность',
  },
  texts: {
    title: 'Способности',
    newTitle: 'Новая способность',
    createLabel: 'Создать способность',
    back: '← К способностям',
    hidden: 'Скрыта',
    listFailed: 'Не удалось загрузить способности',
    saveFailed: 'Не удалось сохранить способность',
    deleteFailed: 'Не удалось удалить способность',
    imageNotSaved: 'Способность сохранена, а картинка — нет',
    deleteConfirm: ({ name }) => `Удалить способность «${name}» безвозвратно?`,
    namePlaceholder: 'Например, Ядовитый луч',
    publicHint:
      'Скрытую способность видите только вы. Опубликованную видят все, но менять её можете только вы.',
    descriptionPlaceholder: 'Что делает способность: дальность, цель, урон…',
    empty: {
      mine: 'У вас пока нет способностей. Создайте первую — например, удар или заклинание.',
      catalog:
        'В каталоге пока пусто. Опубликуйте свою способность, чтобы её увидели другие.',
    },
  },
};

export const EFFECTS: SimpleCatalogDef = {
  section: 'effects',
  bookmarkKind: 'effect',
  path: '/effects',
  api: catalogApi<SimpleEntry, SimpleInput>('/effects'),
  kinds: {
    values: ['basic', ...EFFECT_COMPONENT_KINDS],
    labels: { basic: 'Базовый', ...EFFECT_COMPONENT_LABELS },
    of: (entry) =>
      'components' in entry && entry.components.length > 0
        ? effectComponentKinds(entry.components)
        : ['basic'],
  },
  extras: EFFECT_EXTRAS,
  loadTexts: {
    notFound: 'Эффект не найден',
    failed: 'Не удалось загрузить эффект',
  },
  texts: {
    title: 'Эффекты',
    newTitle: 'Новый эффект',
    createLabel: 'Создать эффект',
    back: '← К эффектам',
    hidden: 'Скрыт',
    listFailed: 'Не удалось загрузить эффекты',
    saveFailed: 'Не удалось сохранить эффект',
    deleteFailed: 'Не удалось удалить эффект',
    imageNotSaved: 'Эффект сохранён, а картинка — нет',
    deleteConfirm: effectDeleteConfirmText,
    namePlaceholder: 'Например, Горение',
    publicHint:
      'Скрытый эффект видите только вы. Опубликованный видят все, но менять его можете только вы.',
    descriptionPlaceholder:
      'Что делает эффект: урон за ход, что запрещает, как его снять…',
    empty: {
      mine: 'У вас пока нет эффектов. Создайте первый — например, горение или тёмное зрение.',
      catalog:
        'В каталоге пока пусто. Опубликуйте свой эффект, чтобы его увидели другие.',
    },
  },
};

export const BLOCKS: SimpleCatalogDef = {
  section: 'blocks',
  path: '/blocks',
  api: catalogApi<SimpleEntry, SimpleInput>('/block-groups'),
  kinds: {
    values: BLOCK_KINDS,
    labels: BLOCK_KIND_LABELS,
    of: (entry) => ('look' in entry ? blockKinds(entry) : []),
  },
  extras: BLOCK_EXTRAS,
  CardActions: BlockCopyPanel,
  loadTexts: {
    notFound: 'Группа блоков не найдена',
    failed: 'Не удалось загрузить группу блоков',
  },
  texts: {
    title: 'Блоки',
    newTitle: 'Новая группа блоков',
    createLabel: 'Создать группу блоков',
    back: '← К блокам',
    hidden: 'Скрыта',
    listFailed: 'Не удалось загрузить блоки',
    saveFailed: 'Не удалось сохранить группу блоков',
    deleteFailed: 'Не удалось удалить группу блоков',
    imageNotSaved: 'Группа блоков сохранена, а картинка — нет',
    deleteConfirm: loadBlockDeleteConfirm,
    namePlaceholder: 'Например, Тлеющие угли',
    publicHint:
      'Скрытую группу видите только вы. Опубликованную видят все и могут скопировать себе — со ссылкой на вас и вашими обновлениями по их желанию.',
    descriptionPlaceholder:
      'Что это за блоки: где встречаются, чем опасны, как выглядят…',
    empty: {
      mine: 'У вас пока нет своих блоков. Создайте группу — например, тлеющие угли или ядовитый мох. Базовые блоки есть у всех и без неё.',
      catalog:
        'В каталоге пока пусто. Опубликуйте свою группу блоков, чтобы её увидели другие.',
    },
  },
};

export const MODELS: SimpleCatalogDef = {
  section: 'models',
  path: '/models',
  api: catalogApi<SimpleEntry, SimpleInput>('/voxel-models'),
  kinds: {
    values: MODEL_KINDS,
    labels: MODEL_KIND_LABELS,
    of: (entry) => ('voxels' in entry ? modelKinds(entry) : []),
  },
  extras: MODEL_EXTRAS,
  CardActions: ModelCopyPanel,
  loadTexts: {
    notFound: 'Модель не найдена',
    failed: 'Не удалось загрузить модель',
  },
  texts: {
    title: 'Модели',
    newTitle: 'Новая модель',
    createLabel: 'Создать модель',
    back: '← К моделям',
    hidden: 'Скрыта',
    listFailed: 'Не удалось загрузить модели',
    saveFailed: 'Не удалось сохранить модель',
    deleteFailed: 'Не удалось удалить модель',
    imageNotSaved: 'Модель сохранена, а картинка — нет',
    deleteConfirm: loadModelDeleteConfirm,
    namePlaceholder: 'Например, Бочка',
    publicHint:
      'Скрытую модель видите только вы. Опубликованную видят все и могут скопировать себе — со ссылкой на вас и вашими обновлениями по их желанию.',
    descriptionPlaceholder:
      'Что это: мебель, дверь, статуя… Где встречается, из чего сделано.',
    empty: {
      mine: 'У вас пока нет моделей. Нарисуйте первую — например, бочку, стол или дверь. Позже их можно будет ставить на карту как обстановку.',
      catalog:
        'В каталоге пока пусто. Опубликуйте свою модель, чтобы её увидели другие.',
    },
  },
};

export const FURNITURE: SimpleCatalogDef = {
  section: 'furniture',
  path: '/furniture',
  api: catalogApi<SimpleEntry, SimpleInput>('/furniture'),
  kinds: {
    values: FURNITURE_KINDS,
    labels: FURNITURE_KIND_LABELS,
    of: (entry) => ('mount' in entry ? furnitureKinds(entry) : []),
  },
  extras: FURNITURE_EXTRAS,
  CardActions: FurnitureCopyPanel,
  loadTexts: {
    notFound: 'Обстановка не найдена',
    failed: 'Не удалось загрузить обстановку',
  },
  texts: {
    title: 'Обстановка',
    newTitle: 'Новая обстановка',
    createLabel: 'Создать обстановку',
    back: '← К обстановке',
    hidden: 'Скрыта',
    listFailed: 'Не удалось загрузить обстановку',
    saveFailed: 'Не удалось сохранить обстановку',
    deleteFailed: 'Не удалось удалить обстановку',
    imageNotSaved: 'Обстановка сохранена, а картинка — нет',
    deleteConfirm: ({ name }) =>
      `Удалить обстановку «${name}» безвозвратно? Её модель останется в «Моделях».`,
    namePlaceholder: 'Например, Обеденный стол',
    publicHint:
      'Скрытую обстановку видите только вы. Опубликованную видят все вместе с её моделью и могут скопировать себе.',
    descriptionPlaceholder:
      'Что это: стол, статуя, факел на стене… Где стоит, из чего сделано.',
    empty: {
      mine: 'У вас пока нет обстановки. Создайте первую — например, стол или факел на стене: выберите свою модель или нарисуйте новую прямо в форме.',
      catalog:
        'В каталоге пока пусто. Опубликуйте свою обстановку, чтобы её увидели другие.',
    },
  },
};
