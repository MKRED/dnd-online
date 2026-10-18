import type { Effect } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import type { SimpleEntry } from '../simpleCatalogs';

// Вопрос перед сохранением записи простого каталога (docs/plan/abilities.md, этап 8) —
// как у наборов (items/ItemForm/saveConfirmation.ts). Сервер без флагов ответил бы 409
// на публикацию или скрыл бы запись молча — форма спрашивает заранее.
export interface SaveConfirmation {
  title: string;
  lines: string[];
  // Ответы: подпись кнопки и флаги запроса, которые она добавляет.
  actions: { label: string; flags: SaveFlags }[];
}

export interface SaveFlags {
  publishEffects?: boolean;
  hideAbilities?: boolean;
}

const list = (names: string[]) => names.map((name) => `«${name}»`).join(', ');

// Публикуем способность, а в её шагах свои скрытые эффекты: опубликовать их вместе с ней.
// Чужие скрытые (effect: null) сюда не попадают — их не даёт сохранить проверка формы.
export function abilitySaveConfirmation(
  values: SimpleFormValues,
): SaveConfirmation | null {
  if (!values.isPublic) return null;
  const effects = values.steps.flatMap((step) => [
    ...step.hitEffects,
    ...(step.check === 'none' ? [] : step.missEffects),
  ]);
  const names = [
    ...new Set(
      effects.flatMap(({ effect }) =>
        effect && !effect.isPublic ? [effect.name] : [],
      ),
    ),
  ];
  if (names.length === 0) return null;
  return {
    title: 'В применении скрытые эффекты',
    lines: [
      `${list(names)} видите только вы. Способность можно опубликовать только вместе с ними.`,
    ],
    actions: [
      {
        label: 'Опубликовать всё и сохранить',
        flags: { publishEffects: true },
      },
    ],
  };
}

// Скрываем эффект, который накладывают опубликованные способности. Новый эффект ни в
// каких способностях не стоит, поэтому спрашиваем только при правке опубликованного.
export function effectSaveConfirmation(
  values: SimpleFormValues,
  saved: SimpleEntry | null,
): SaveConfirmation | null {
  if (!saved?.isPublic || values.isPublic) return null;
  const { abilities } = saved as Effect;
  const own = (abilities?.mine ?? [])
    .filter((ability) => ability.isPublic)
    .map((ability) => ability.name);
  const others = abilities?.othersCount ?? 0;
  if (own.length === 0 && others === 0) return null;
  const hiddenLine = 'строку «эффект скрыт автором»';
  return {
    title: 'Эффект накладывают опубликованные способности',
    lines: [
      ...(own.length > 0
        ? [
            `Ваши способности: ${list(own)}. Если оставить их опубликованными, другие увидят в них ${hiddenLine}.`,
          ]
        : []),
      ...(others > 0
        ? [`Чужих способностей: ${others}. В них другие увидят ${hiddenLine}.`]
        : []),
    ],
    actions:
      own.length > 0
        ? [
            {
              label: 'Скрыть и мои способности',
              flags: { hideAbilities: true },
            },
            { label: 'Скрыть только эффект', flags: {} },
          ]
        : [{ label: 'Скрыть', flags: {} }],
  };
}
