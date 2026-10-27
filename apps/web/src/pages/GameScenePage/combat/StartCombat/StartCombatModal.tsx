import { Button, Group, Modal, Text } from '@mantine/core';
import { IconSwords, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { pluralRu, type CombatantInput } from 'shared';
import CandidateRowItem from './CandidateRowItem';
import { candidateGroups, type CandidateRow } from './candidateGroups';
import classes from './StartCombat.module.css';

interface StartCombatModalProps {
  opened: boolean;
  // start — «Начать бой», join — новичок в идущий бой.
  mode: 'start' | 'join';
  rows: readonly CandidateRow[];
  busy: boolean;
  onSubmit: (participants: CombatantInput[]) => Promise<boolean>;
  onClose: () => void;
}

const participantsText = (n: number) =>
  `${n} ${pluralRu(n, ['участник', 'участника', 'участников'])}`;

// Окно «Начать бой» (docs/plan/combat.md, этап 3; макет «Начать бой»): кто на сцене идёт в
// бой и кто застигнут врасплох. В начале отмечены те, кого видит партия; новичков в идущий
// бой мастер отмечает сам.
function StartCombatModal({
  opened,
  mode,
  rows,
  busy,
  onSubmit,
  onClose,
}: StartCombatModalProps) {
  // Окно монтируется заново на каждое открытие (key у страницы) — начальный выбор отсюда.
  const [checked, setChecked] = useState(
    () =>
      new Set(
        mode === 'start' ? rows.filter((r) => r.seen).map((r) => r.key) : [],
      ),
  );
  const [surprised, setSurprised] = useState(() => new Set<string>());
  const toggle = (
    set: Set<string>,
    update: (next: Set<string>) => void,
    key: string,
    on: boolean,
  ) => {
    const next = new Set(set);
    if (on) next.add(key);
    else next.delete(key);
    update(next);
  };
  const chosen = rows.filter((r) => checked.has(r.key));
  const submit = () => {
    const participants = chosen.map((row): CombatantInput => ({
      ...(row.kind === 'figure'
        ? { kind: 'figure', characterId: row.characterId }
        : { kind: 'creature', objectId: row.objectId }),
      surprised: surprised.has(row.key),
    }));
    void onSubmit(participants).then((ok) => ok && onClose());
  };
  const groups = candidateGroups(rows);
  const start = mode === 'start';
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={start ? 'Начать бой' : 'Позвать в бой'}
      size="md"
    >
      {groups.length === 0 ? (
        <Text c="dimmed" size="sm">
          {start
            ? 'На сцене нет ни героев, ни существ.'
            : 'Все на сцене уже в бою.'}
        </Text>
      ) : (
        <>
          <Text size="sm" c="dimmed" mb="sm">
            {start
              ? 'Отмечены те, кого видит партия. Врасплох — помеха на бросок инициативы.'
              : 'Новичок бросит инициативу и встанет в очередь по своему числу.'}
          </Text>
          {groups.map((group) => (
            <div key={group.kind} className={classes.group}>
              <div className={classes.groupTitle}>{group.title}</div>
              {group.rows.map((row) => (
                <CandidateRowItem
                  key={row.key}
                  row={row}
                  checked={checked.has(row.key)}
                  surprised={surprised.has(row.key)}
                  onChecked={(on) => toggle(checked, setChecked, row.key, on)}
                  onSurprised={(on) =>
                    toggle(surprised, setSurprised, row.key, on)
                  }
                />
              ))}
            </div>
          ))}
        </>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Отмена
        </Button>
        <Button
          leftSection={
            start ? <IconSwords size={16} /> : <IconUserPlus size={16} />
          }
          disabled={chosen.length === 0}
          loading={busy}
          onClick={submit}
        >
          {start ? 'Начать бой' : 'Позвать'}
          {chosen.length > 0 && ` · ${participantsText(chosen.length)}`}
        </Button>
      </Group>
    </Modal>
  );
}

export default StartCombatModal;
