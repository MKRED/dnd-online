import { Button, Group, Modal, NumberInput, Stack } from '@mantine/core';
import { useState } from 'react';

interface QuantityDialogProps {
  title: string;
  label: string;
  initial: number;
  max: number;
  confirmLabel: string;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

// Спросить число: сколько переложить или новое количество. Монтируется на время вопроса,
// поэтому начальное значение берётся при открытии.
function QuantityDialog({
  title,
  label,
  initial,
  max,
  confirmLabel,
  onConfirm,
  onClose,
}: QuantityDialogProps) {
  const [value, setValue] = useState<number | string>(initial);
  const quantity = Number(value);
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= max;

  return (
    <Modal opened onClose={onClose} title={title} size="xs" centered>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onConfirm(quantity);
        }}
      >
        <Stack gap="md">
          <NumberInput
            label={label}
            description={`От 1 до ${max}`}
            value={value}
            onChange={setValue}
            min={1}
            max={max}
            allowDecimal={false}
            allowNegative={false}
            clampBehavior="strict"
            data-autofocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={!valid}>
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default QuantityDialog;
