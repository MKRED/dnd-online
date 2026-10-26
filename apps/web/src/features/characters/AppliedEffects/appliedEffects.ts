import {
  CONDITION_RULES,
  formatEffectComponent,
  type AbilityLink,
  type EffectComponent,
  type EffectLink,
} from 'shared';

// Что даёт одна составляющая: у состояния — ещё и что оно значит по книге
// («Схваченный» → «Скорость 0»), иначе непонятно, почему у существа 0 фт.
export interface ComponentLine {
  text: string;
  details: string[];
}

// Эффект или черта на существе строкой вкладки «Эффекты» (вариант А, замечания после первой
// партии, 2026-10-26): имя, откуда и всё, что меняет, включая Скорость и КД.
export interface AppliedEffectRow {
  key: string;
  kind: 'effect' | 'ability';
  // null — запись скрыта или удалена автором: окна у неё нет.
  id: string | null;
  name: string;
  source: string;
  lines: ComponentLine[];
  // Почему не действует; null — действует.
  idle: string | null;
}

export function componentLines(
  components: readonly EffectComponent[],
): ComponentLine[] {
  return components.map((component) => ({
    text: formatEffectComponent(component),
    details:
      component.kind === 'condition'
        ? CONDITION_RULES[component.condition].components.map(
            formatEffectComponent,
          )
        : [],
  }));
}

const MISSING = { hidden: 'скрыт автором', deleted: 'удалён автором' };

// Наложенные эффекты; source — откуда они: «наложен», «эффект вида».
export function effectRows(
  entries: readonly ({ id: string } & EffectLink)[],
  source: string,
): AppliedEffectRow[] {
  return entries.map((entry) => {
    const row = { key: `e:${entry.id}`, kind: 'effect' as const, source };
    if (!entry.effect) {
      return {
        ...row,
        id: null,
        name: 'Эффект',
        lines: [],
        idle: MISSING[entry.missing],
      };
    }
    return {
      ...row,
      id: entry.effect.id,
      name: entry.effect.name,
      lines: componentLines(entry.effect.components),
      idle: entry.inactive ? 'не действует' : null,
    };
  });
}

// Черты со своими составляющими (docs/plan/done/traits.md); черта без них ничего не меняет
// и в список не идёт, как и скрытая или удалённая — у неё не видно, что она даёт.
export function traitRows(
  entries: readonly ({ id: string } & AbilityLink)[],
): AppliedEffectRow[] {
  return entries.flatMap((entry) => {
    const { ability } = entry;
    if (
      !ability ||
      ability.activation.kind !== 'trait' ||
      ability.passive.length === 0
    )
      return [];
    return [
      {
        key: `a:${entry.id}`,
        kind: 'ability' as const,
        id: ability.id,
        name: ability.name,
        source: 'черта',
        lines: componentLines(ability.passive),
        idle: entry.inactive ? 'не действует' : null,
      },
    ];
  });
}
