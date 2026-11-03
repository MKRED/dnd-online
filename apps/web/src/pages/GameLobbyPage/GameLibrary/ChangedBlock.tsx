import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import type { GameLibraryItem, GameLibraryRef } from 'shared';
import classes from './ChangedBlock.module.css';
import LibraryRow from './LibraryRow';
import RefreshAllDialog from './RefreshAllDialog';
import { ALL } from './useGameLibrary';

interface ChangedBlockProps {
  gameId: string;
  entries: GameLibraryItem[];
  refreshing: string | null;
  onOpen: (ref: GameLibraryRef) => void;
  onRefresh: (ref: GameLibraryRef) => void;
  onRefreshAll: (entries: GameLibraryItem[]) => void;
  onConfirmingChange: (confirming: boolean) => void;
}

// Копии, изменённые в справочнике, — отдельным блоком над списком: мастер видит их сразу,
// не листая всю библиотеку. «Обновить все» берёт то, что в блоке сейчас видно (с чипом
// вида и поиском), и спрашивает подтверждение: правки, сделанные в игре, пропадут.
function ChangedBlock({
  gameId,
  entries,
  refreshing,
  onOpen,
  onRefresh,
  onRefreshAll,
  onConfirmingChange,
}: ChangedBlockProps) {
  const [confirming, setConfirming] = useState(false);
  // Шторка и окно оба ловят Escape на window, раньше всех — шторка; пока окно открыто,
  // шторке Escape выключают, иначе он закрыл бы обе.
  useEffect(() => {
    onConfirmingChange(confirming);
    return () => onConfirmingChange(false);
  }, [confirming, onConfirmingChange]);
  return (
    <Paper
      component="section"
      aria-label="Изменены в справочнике"
      withBorder
      p="sm"
      radius="md"
      className={classes.block}
    >
      <Stack gap="sm">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="sm" fw={600} className={classes.title}>
            Изменены в справочнике · {entries.length}
          </Text>
          {entries.length > 1 && (
            <Button
              size="xs"
              variant="outline"
              // Переменные кнопки Mantine пишет в style — класс их не перебьёт.
              style={{
                '--button-color': 'var(--changed-accent)',
                '--button-bd': '1px solid var(--changed-accent)',
              }}
              loading={refreshing === ALL}
              disabled={refreshing !== null}
              onClick={() => setConfirming(true)}
            >
              Обновить все
            </Button>
          )}
        </Group>
        {entries.map((entry) => {
          const key = `${entry.kind}:${entry.sourceId}`;
          return (
            <LibraryRow
              key={key}
              gameId={gameId}
              entry={entry}
              showSource={false}
              refreshing={refreshing === key}
              disabled={refreshing !== null}
              onOpen={() => onOpen(entry)}
              onRefresh={() => onRefresh(entry)}
            />
          );
        })}
      </Stack>
      {confirming && (
        <RefreshAllDialog
          entries={entries}
          onConfirm={() => {
            setConfirming(false);
            onRefreshAll(entries);
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </Paper>
  );
}

export default ChangedBlock;
