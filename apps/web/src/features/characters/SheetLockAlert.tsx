import { Alert, Anchor } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { CharacterSheetLock } from 'shared';

// Почему лист нельзя править: персонаж на месте в игре, где идёт встреча. Сервер на
// правку ответит 409, а страница говорит об этом заранее и ведёт в игру.
function SheetLockAlert({ lock }: { lock: CharacterSheetLock }) {
  return (
    <Alert color="yellow" icon={<IconLock size={18} />} title="Лист закрыт">
      Персонаж в игре{' '}
      <Anchor component={Link} to={`/games/${lock.gameId}`} inherit>
        «{lock.gameName}»
      </Anchor>
      : идёт встреча. Править лист можно будет после её конца.
    </Alert>
  );
}

export default SheetLockAlert;
