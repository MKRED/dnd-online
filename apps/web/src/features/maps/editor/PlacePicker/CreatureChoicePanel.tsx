import {
  ActionIcon,
  Button,
  Kbd,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import classes from '../BlockPicker/BlockPicker.module.css';
import SectionLabel from '../ToolPanel/SectionLabel';
import ChoicePicture from './ChoicePicture';
import CreaturePickerModal from './CreaturePickerModal';
import {
  objectChoiceLabel,
  objectChoiceMeta,
  objectChoiceName,
  recentKey,
  type ObjectChoice,
  type RecentPlace,
} from './placeChoice';

interface CreatureChoicePanelProps {
  // Ставящееся существо; null — ничего не ставится, щелчок выбирает и двигает.
  choice: ObjectChoice | null;
  // Недавние существа.
  recent: readonly RecentPlace[];
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  // Выбрано в окне — становится первым в недавних.
  onPick: (choice: ObjectChoice) => void;
  // Взято из недавних в панели — порядок не меняется.
  onSelectRecent: (recent: RecentPlace) => void;
  onClear: () => void;
}

// «Поставить существо» в панели инструмента «Существа» (замечания после первой партии,
// 2026-10-26): кнопка окна выбора или выбранное с ✕ и строка недавних, как у «Строить».
function CreatureChoicePanel(props: CreatureChoicePanelProps) {
  const { choice, recent } = props;
  const currentKey = choice && recentKey({ type: 'object', choice });
  return (
    <Stack gap={6}>
      <SectionLabel title="Поставить существо" />
      {choice ? (
        <div className={classes.choiceCard}>
          <ChoicePicture choice={choice} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600} truncate>
              {objectChoiceName(choice)}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {objectChoiceMeta(choice) || 'существо'}
            </Text>
          </div>
          <Tooltip label="Не ставить (Esc)" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Не ставить существо"
              onClick={props.onClear}
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </div>
      ) : (
        <Button
          variant="default"
          size="xs"
          onClick={props.onOpen}
          rightSection={<Kbd size="xs">B</Kbd>}
        >
          Монстр или НПС
        </Button>
      )}
      {recent.length > 0 && (
        <div className={classes.recent} aria-label="Недавние существа">
          {recent.map((r) => {
            if (r.type !== 'object') return null;
            const name = objectChoiceLabel(r.choice);
            const selected = recentKey(r) === currentKey;
            return (
              <Tooltip key={recentKey(r)} label={name} withArrow>
                <UnstyledButton
                  className={classes.recentTile}
                  data-selected={selected || undefined}
                  aria-pressed={selected}
                  aria-label={name}
                  onClick={() => props.onSelectRecent(r)}
                >
                  <ChoicePicture choice={r.choice} size={34} />
                </UnstyledButton>
              </Tooltip>
            );
          })}
        </div>
      )}
      {props.opened && (
        <CreaturePickerModal
          current={choice}
          recent={recent}
          onPick={(picked) => {
            props.onPick(picked);
            props.onClose();
          }}
          onClose={props.onClose}
        />
      )}
    </Stack>
  );
}

export default CreatureChoicePanel;
