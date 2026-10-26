import { canBePrepared, type CharacterAbilityEntry } from 'shared';
import {
  abilityEntryName,
  AbilityRow,
  useLinkEditor,
} from '../../abilityLinks';
import { characterAbilitiesApi } from './abilitiesApi';
import PreparedMark from './PreparedMark';
import type { SheetSpellActions } from './sheetSpellActions';

// Правки способностей персонажа и его строка: у заклинания 1 круга и выше слева отметка
// «подготовлено». Без onChange — только чтение; prepareInGame — отметка через игру, без
// остальных правок.
export function useAbilitiesEditor(
  characterId: string,
  onChange: ((abilities: CharacterAbilityEntry[]) => void) | undefined,
  prepareInGame?: SheetSpellActions['prepare'],
) {
  const editor = useLinkEditor(onChange);
  const api = characterAbilitiesApi(characterId);
  const { busyId, run } = editor;

  const renderRow = (entry: CharacterAbilityEntry) => {
    const busy = busyId === entry.id;
    const name = abilityEntryName(entry);
    const preparable = entry.ability !== null && canBePrepared(entry.ability);
    const prepare = () =>
      void run(
        entry.id,
        prepareInGame
          ? () => prepareInGame(entry.id, !entry.prepared).then(() => [])
          : () => api.update(entry.id, { prepared: !entry.prepared }),
        'Не удалось отметить подготовку',
      );
    return (
      <AbilityRow
        key={entry.id}
        entry={entry}
        busy={busy}
        inactiveHint="Вы скрыли эту способность: у персонажа её нет"
        leading={
          preparable && (
            <PreparedMark
              prepared={entry.prepared}
              name={name}
              busy={busy}
              onToggle={onChange || prepareInGame ? prepare : undefined}
            />
          )
        }
        // Убираем без подтверждения: вернуть способность — пара кликов в окне добавления.
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
