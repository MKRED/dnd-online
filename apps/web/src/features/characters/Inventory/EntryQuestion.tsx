import { INVENTORY_MAX_QUANTITY, type InventoryEntry } from 'shared';
import { entryName } from './inventoryView';
import QuantityDialog from './QuantityDialog';

export type Question =
  | { kind: 'move'; entry: InventoryEntry }
  | { kind: 'quantity'; entry: InventoryEntry };

interface EntryQuestionProps {
  question: Question;
  onMove: (entry: InventoryEntry, quantity: number) => void;
  onSetQuantity: (entry: InventoryEntry, quantity: number) => void;
  onClose: () => void;
}

// Вопрос по строке: сколько переложить (по умолчанию — всё) или новое количество.
function EntryQuestion({
  question,
  onMove,
  onSetQuantity,
  onClose,
}: EntryQuestionProps) {
  const { entry } = question;
  const name = entryName(entry);
  if (question.kind === 'move') {
    return (
      <QuantityDialog
        title={`Переложить: ${name}`}
        label={
          entry.location === 'carried'
            ? 'Сколько убрать в хранилище'
            : 'Сколько взять с собой'
        }
        initial={entry.quantity}
        max={entry.quantity}
        confirmLabel="Переложить"
        onClose={onClose}
        onConfirm={(quantity) => onMove(entry, quantity)}
      />
    );
  }
  return (
    <QuantityDialog
      title={`Количество: ${name}`}
      label="Сколько лежит"
      initial={entry.quantity}
      max={INVENTORY_MAX_QUANTITY}
      confirmLabel="Сохранить"
      onClose={onClose}
      onConfirm={(quantity) => onSetQuantity(entry, quantity)}
    />
  );
}

export default EntryQuestion;
