import { Alert, Button, Modal, SegmentedControl, Text } from '@mantine/core';
import { IconDice5 } from '@tabler/icons-react';
import { useState } from 'react';
import {
  rollModeOf,
  type D20Roll,
  type D20RollInput,
  type RollMode,
} from 'shared';
import RollDisplay from './RollDisplay';
import { MASTER_MODES } from './rollWindowText';
import classes from './RollWindow.module.css';
import { useDiceRoll } from './useDiceRoll';

interface RollWindowProps {
  opened: boolean;
  // Что бросают и чем: «Инициатива» и «проверка Ловкости».
  title: string;
  caption: string | null;
  name: string;
  // Слагаемые и причины до броска; null — не видны смотрящему.
  pending: Omit<D20RollInput, 'master'> | null;
  // Мастеру — переключатель вместо правил.
  master: boolean;
  onRoll: (mode: RollMode | null) => Promise<D20Roll>;
  onClose: () => void;
}

// Окно броска в духе BG3 (docs/plan/combat.md, «Окно броска»; макет «Окно броска»): кость
// по центру, под ней слагаемые и причины преимущества и помехи; «Бросить кубик» крутит
// кость, итог остаётся в окне до «Готово». Окно общее — потом его возьмут атаки и проверки.
function RollWindow({
  opened,
  title,
  caption,
  name,
  pending,
  master,
  onRoll,
  onClose,
}: RollWindowProps) {
  const [choice, setChoice] = useState('rules');
  const { phase, roll } = useDiceRoll(onRoll);
  const rolling = phase.kind === 'rolling';
  const done = phase.kind === 'done' ? phase.roll : null;
  const rules = pending ? rollModeOf(pending.reasons, null) : 'normal';
  const mode: RollMode = choice === 'rules' ? rules : (choice as RollMode);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={380}
      // Пока кость в полёте, окно не закрыть: бросок уже ушёл на сервер.
      closeOnClickOutside={!rolling}
      closeOnEscape={!rolling}
      withCloseButton={!rolling}
      title={
        <span className={classes.title}>
          {title}
          {caption && <span className={classes.caption}> · {caption}</span>}
        </span>
      }
    >
      <div className={classes.body}>
        <Text fw={700} size="lg" ta="center">
          {name}
        </Text>
        <RollDisplay
          pending={pending}
          rolling={phase.kind === 'rolling' ? phase.face : null}
          done={done}
          mode={mode}
        />
        {master && !done && (
          <SegmentedControl
            size="xs"
            fullWidth
            data={MASTER_MODES}
            value={choice}
            onChange={setChoice}
            disabled={rolling}
            aria-label="Как бросать"
          />
        )}
        {phase.kind === 'ready' && phase.error && (
          <Alert color="red" p="xs">
            {phase.error}
          </Alert>
        )}
        {done ? (
          <Button key="done" fullWidth onClick={onClose} data-autofocus>
            Готово
          </Button>
        ) : (
          <Button
            key="roll"
            fullWidth
            size="md"
            leftSection={<IconDice5 size={18} />}
            loading={rolling}
            onClick={() =>
              roll(choice === 'rules' ? null : (choice as RollMode))
            }
            data-autofocus
          >
            Бросить кубик
          </Button>
        )}
      </div>
    </Modal>
  );
}

export default RollWindow;
