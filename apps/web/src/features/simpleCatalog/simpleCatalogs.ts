import {
  ABILITY_CATEGORIES,
  EFFECT_CATEGORIES,
  type Ability,
  type AbilityInput,
  type Effect,
  type EffectInput,
} from 'shared';
import { catalogApi, type CatalogSection } from '../catalog';
import {
  ABILITY_EXTRAS,
  EFFECT_EXTRAS,
  type CatalogExtras,
} from './catalogExtras';

// Запись простого каталога — способность или эффект (docs/plan/abilities-effects.md).
// Страницы у них одни; чем разделы отличаются — категории, их поля (CategoryFields) и
// общие поля раздела (extras).
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
  // Общие поля раздела: длительность эффекта, активация и затраты способности.
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
    deleteConfirm: (name) => `Удалить способность «${name}» безвозвратно?`,
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
  path: '/effects',
  api: catalogApi<SimpleEntry, SimpleInput>('/effects'),
  categories: EFFECT_CATEGORIES,
  categoryLabels: { basic: 'Базовый', sense: 'Чувство' },
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
