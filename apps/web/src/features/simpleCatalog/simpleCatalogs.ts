import {
  ABILITY_CATEGORIES,
  EFFECT_CATEGORIES,
  type Ability,
  type AbilityInput,
  type Effect,
  type EffectInput,
} from 'shared';
import { catalogApi, type CatalogSection } from '../catalog';

// Запись простого каталога — способность или эффект (docs/plan/abilities-effects.md).
// Пока у обоих одна категория без своих полей, и формы у них почти одинаковые: у эффекта
// есть длительность. Когда у каталога появятся свои категории, его страницы получат свои
// поля категории.
export type SimpleEntry = Ability | Effect;
export type SimpleInput = AbilityInput | EffectInput;

// Чем раздел справочника отличается от другого: адрес, запросы, категории и тексты
// (род у способности женский, у эффекта мужской).
export interface SimpleCatalogDef {
  section: Exclude<CatalogSection, 'items'>;
  path: string;
  api: ReturnType<typeof catalogApi<SimpleEntry, SimpleInput>>;
  categories: readonly string[];
  categoryLabels: Record<string, string>;
  // Длительность — общее поле эффектов (docs/plan/effects.md).
  hasDuration: boolean;
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
    deleteConfirm: (name: string) => string;
    namePlaceholder: string;
    publicHint: string;
    descriptionPlaceholder: string;
    empty: { mine: string; catalog: string };
  };
}

export const ABILITIES: SimpleCatalogDef = {
  section: 'abilities',
  path: '/abilities',
  api: catalogApi<SimpleEntry, SimpleInput>('/abilities'),
  categories: ABILITY_CATEGORIES,
  categoryLabels: { basic: 'Базовая' },
  hasDuration: false,
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
    deleteConfirm: (name) => `Удалить способность «${name}» безвозвратно?`,
    namePlaceholder: 'Например, Ядовитый луч',
    publicHint:
      'Скрытую способность видите только вы. Опубликованную видят все, но менять её можете только вы.',
    descriptionPlaceholder:
      'Что делает способность: дальность, урон, время активации…',
    empty: {
      mine: 'У вас пока нет способностей. Создайте первую — например, удар или заклинание.',
      catalog:
        'В каталоге пока пусто. Опубликуйте свою способность, чтобы её увидели другие.',
    },
  },
};

export const EFFECTS: SimpleCatalogDef = {
  section: 'effects',
  path: '/effects',
  api: catalogApi<SimpleEntry, SimpleInput>('/effects'),
  categories: EFFECT_CATEGORIES,
  categoryLabels: { basic: 'Базовый', sense: 'Чувство' },
  hasDuration: true,
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
    deleteConfirm: (name) => `Удалить эффект «${name}» безвозвратно?`,
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
