import { formatSpellLevel, type MonsterAbilityEntry } from 'shared';
import {
  abilityEntryName,
  AbilityRow,
  abilitySummary,
  PerDaySelect,
  useAbilityLinksEditor,
} from '../../abilityLinks';
import { monsterAbilitiesApi } from './monsterAbilitiesApi';

// Правки способностей монстра и его строка: у заклинания — круг в строке и, у автора,
// выбор частоты справа. Без onChange — только чтение.
export function useMonsterAbilitiesEditor(
  monsterId: string,
  onChange: ((abilities: MonsterAbilityEntry[]) => void) | undefined,
) {
  const editor = useAbilityLinksEditor(onChange);
  const api = monsterAbilitiesApi(monsterId);
  const { busyId, run } = editor;

  const renderRow = (entry: MonsterAbilityEntry) => {
    const busy = busyId === entry.id;
    const { ability } = entry;
    const spell = ability?.category === 'spell' ? ability : null;
    return (
      <AbilityRow
        key={entry.id}
        entry={entry}
        busy={busy}
        inactiveHint="Вы скрыли эту способность: у монстра её нет"
        summary={
          spell
            ? [formatSpellLevel(spell.level ?? 0), abilitySummary(spell)]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        // Частота — заголовок группы, поэтому смена переносит строку в другую группу.
        trailing={
          spell &&
          onChange && (
            <PerDaySelect
              size="xs"
              w={{ base: 140, xs: 150 }}
              aria-label={`Частота «${abilityEntryName(entry)}»`}
              value={entry.perDay}
              disabled={busy}
              onChange={(perDay) =>
                void run(
                  entry.id,
                  () => api.update(entry.id, { perDay }),
                  'Не удалось сменить частоту',
                )
              }
            />
          )
        }
        onRemove={
          onChange &&
          (() =>
            void run(
              entry.id,
              () => api.remove(entry.id),
              'Не удалось убрать способность',
            ))
        }
      />
    );
  };

  return { editor, api, renderRow };
}
