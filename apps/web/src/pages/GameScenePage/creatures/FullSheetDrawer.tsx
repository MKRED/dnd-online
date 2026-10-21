import { Alert, Drawer, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
import type { Character, Monster } from 'shared';
import { CharacterSheet } from '../../../features/characters';
import { getGameCharacter, getGameLibraryEntry } from '../../../features/games';
import MonsterCard from '../../../features/monsters/MonsterCard';
import { errorMessage } from '../../../lib/apiRequest';

// Чей полный лист открыт: персонаж игрока — из игры, монстр и НПС — копия в библиотеке.
export type SheetTarget =
  | { kind: 'character'; id: string }
  | { kind: 'monster' | 'npc'; sourceId: string };

type Loaded =
  | { kind: 'character'; record: Character }
  | { kind: 'monster'; record: Monster };

function load(gameId: string, target: SheetTarget): Promise<Loaded> {
  if (target.kind === 'character') {
    return getGameCharacter(gameId, target.id).then((record) => ({
      kind: 'character',
      record,
    }));
  }
  return getGameLibraryEntry(gameId, target.kind, target.sourceId).then(
    (entry): Loaded =>
      entry.kind === 'monster'
        ? { kind: 'monster', record: entry.record }
        : { kind: 'character', record: entry.record as Character },
  );
}

interface FullSheetDrawerProps {
  gameId: string;
  target: SheetTarget | null;
  onClose: () => void;
}

// Содержимое шторки: своё на каждый открытый лист (key), поэтому начинает с загрузки.
function SheetContent({
  gameId,
  target,
}: {
  gameId: string;
  target: SheetTarget;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    load(gameId, target)
      .then((result) => {
        if (alive) setLoaded(result);
      })
      .catch((err: unknown) => {
        console.error('Failed to load the full sheet', err);
        if (alive) setError(errorMessage(err, 'Не удалось открыть лист'));
      });
    return () => {
      alive = false;
    };
  }, [gameId, target]);

  if (error) return <Alert color="red">{error}</Alert>;
  if (!loaded) return <Loader />;
  return loaded.kind === 'character' ? (
    <CharacterSheet character={loaded.record} aside={null} images={false} />
  ) : (
    <MonsterCard monster={loaded.record} showHidden aside={null} />
  );
}

// «Полный лист» из карточки (docs/plan/game.md, этап 8): лист персонажа или стат-блок
// поверх сцены, только для чтения — правки в карточке. Галереи нет: её картинки видит
// только владелец.
function FullSheetDrawer({ gameId, target, onClose }: FullSheetDrawerProps) {
  return (
    <Drawer
      opened={target !== null}
      onClose={onClose}
      position="right"
      size="xl"
      title="Полный лист"
    >
      {target && (
        <SheetContent
          key={JSON.stringify(target)}
          gameId={gameId}
          target={target}
        />
      )}
    </Drawer>
  );
}

export default FullSheetDrawer;
