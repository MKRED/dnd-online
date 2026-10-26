import { useState } from 'react';
import type { SpellSlots, SpellSlotsExpended } from 'shared';
import type { SheetSpellActions } from './sheetSpellActions';
import { errorMessage } from '../../../lib/apiRequest';
import { spendSpellSlots } from '../charactersApi';

// Потраченные ячейки сохраняются сразу. Правки идут по одной: пока запрос в пути, кружки
// заняты — иначе два быстрых клика прислали бы одно и то же число. spend — правка через
// игру вместо листа в справочнике.
export function useSpellSlotsEditor(
  characterId: string,
  onChange: ((spellSlots: SpellSlots) => void) | undefined,
  spend?: SheetSpellActions['spend'],
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (expended: SpellSlotsExpended, failure: string) => {
    setBusy(true);
    setError(null);
    try {
      if (spend) await spend(expended);
      else
        onChange?.((await spendSpellSlots(characterId, expended)).spellSlots);
    } catch (err: unknown) {
      console.error('Spell slot change failed', err);
      setError(errorMessage(err, failure));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, save };
}
