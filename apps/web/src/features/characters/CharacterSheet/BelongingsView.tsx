import { Fieldset, Stack, Text } from '@mantine/core';
import type { Character, CharacterCurrency } from 'shared';
import { COIN_LABELS } from '../../items/itemLabels';
import SheetField from './SheetField';

// Монеты от дорогих к дешёвым: так кошелёк читается привычнее, чем в порядке формы.
// Сокращения — общие с ценой предмета (docs/dnd/items.md).
const COINS: (keyof CharacterCurrency)[] = ['pp', 'gp', 'ep', 'sp', 'cp'];

// Снаряжение и деньги. Снаряжения в форме пока нет, но его меняют по ходу игры (PATCH),
// поэтому показываем, если оно есть.
function BelongingsView({ character }: { character: Character }) {
  const money = COINS.filter((coin) => character.currency[coin] > 0)
    .map((coin) => `${character.currency[coin]} ${COIN_LABELS[coin]}`)
    .join(' · ');
  const { inventory } = character;
  if (!money && inventory.length === 0) return null;

  return (
    <Fieldset legend="Снаряжение и деньги">
      <Stack gap={6}>
        {money && <SheetField label="Деньги">{money}</SheetField>}
        {inventory.length > 0 && (
          <SheetField label="Снаряжение">
            {inventory
              .map((item) =>
                item.quantity > 1
                  ? `${item.name} ×${item.quantity}`
                  : item.name,
              )
              .join(', ')}
          </SheetField>
        )}
      </Stack>
    </Fieldset>
  );
}

export function PersonalityView({ character }: { character: Character }) {
  const { personality } = character;
  const rows = (
    [
      ['traits', 'Черты характера'],
      ['ideals', 'Идеалы'],
      ['bonds', 'Привязанности'],
      ['flaws', 'Слабости'],
      ['appearance', 'Внешность'],
      ['backstory', 'Предыстория'],
    ] as const
  ).filter(([key]) => personality[key]?.trim());
  if (rows.length === 0) return null;

  return (
    <Fieldset legend="Личность">
      <Stack gap="sm">
        {rows.map(([key, label]) => (
          <div key={key}>
            <Text size="sm" c="dimmed">
              {label}
            </Text>
            <Text
              size="sm"
              style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {personality[key]}
            </Text>
          </div>
        ))}
      </Stack>
    </Fieldset>
  );
}

export default BelongingsView;
