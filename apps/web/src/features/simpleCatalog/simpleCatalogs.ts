import {
  ABILITY_CATEGORIES,
  EFFECT_COMPONENT_KINDS,
  EFFECT_COMPONENT_LABELS,
  effectComponentKinds,
  type Ability,
  type AbilityInput,
  type Effect,
  type EffectInput,
} from 'shared';
import { catalogApi, type CatalogSection } from '../catalog';
import { effectDeleteConfirmText } from './deleteConfirmText';
import {
  ABILITY_EXTRAS,
  EFFECT_EXTRAS,
  type CatalogExtras,
} from './catalogExtras';

// Запись простого каталога — способность или эффект (docs/plan/done/abilities-effects.md).
// Страницы у них одни; чем разделы отличаются — виды записей для чипов и бейджей (kinds)
// и свои поля раздела (extras).
export type SimpleEntry = Ability | Effect;
export type SimpleInput = AbilityInput | EffectInput;

// Чем раздел справочника отличается от другого: адрес, запросы, категории и тексты
// (род у способности женский, у эффекта мужской).
export interface SimpleCatalogDef {
  section: Exclude<CatalogSection, 'items'>;
  // Вид закладки на записи раздела (docs/plan/done/bookmarks.md).
  bookmarkKind: 'ability' | 'effect';
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
    deleteConfirm: (entry: SimpleEntry) => string;
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
