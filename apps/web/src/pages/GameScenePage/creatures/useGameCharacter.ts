import { useCallback, useEffect, useState } from 'react';
import type { Character, GameCharacterChange } from 'shared';
import { changeGameCharacter, getGameCharacter } from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';

// Лист персонажа из игры для карточки (docs/plan/done/game.md, этап 8). version растёт с
// событиями состояния существ: чужая правка перечитывает лист. Правки идут по одной.
export function useGameCharacter(
  gameId: string,
  characterId: string,
  version: number,
) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getGameCharacter(gameId, characterId)
      .then((loaded) => {
        if (alive) setCharacter(loaded);
      })
      .catch((err: unknown) => {
        console.error('Failed to load the game character', err);
        if (alive) setError(errorMessage(err, 'Не удалось загрузить лист'));
      });
    return () => {
      alive = false;
    };
  }, [gameId, characterId, version]);

  const change = useCallback(
    async (next: GameCharacterChange) => {
      setBusy(true);
      setError(null);
      try {
        setCharacter(await changeGameCharacter(gameId, characterId, next));
      } catch (err: unknown) {
        console.error('Game character change failed', err);
        setError(errorMessage(err, 'Не удалось изменить персонажа'));
      } finally {
        setBusy(false);
      }
    },
    [gameId, characterId],
  );

  // Ответ на смену персонажа (другая фигурка) — не этого листа.
  const shown = character?.id === characterId ? character : null;
  return { character: shown, setCharacter, change, busy, error };
}
