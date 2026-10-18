import { Alert, Button, Group, Stack } from '@mantine/core';
import { useState } from 'react';
import type { Character, CharacterEffectEntry } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import AddEffectDialog from './AddEffectDialog';
import EffectBadge from './EffectBadge';
import { applyEffect, removeEffect } from './effectsApi';

interface EffectsStripProps {
  character: Character;
  // Есть — автор накладывает и снимает эффекты; нет — лист только для чтения.
  onChange?: (effects: CharacterEffectEntry[]) => void;
}

// Полоса плашек наложенных эффектов вверху листа (docs/plan/done/character-effects.md):
// эффект меняет броски на любой части листа, поэтому он виден сразу, а не в разделе.
// Правки идут по одной: пока запрос в пути, плашка (или «Наложить») занята.
function EffectsStrip({ character, onChange }: EffectsStripProps) {
  const { id, effects } = character;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (!onChange && effects.length === 0) return null;

  // key — id строки или 'add'.
  const run = async (
    key: string,
    request: () => Promise<CharacterEffectEntry[]>,
    failure: string,
  ): Promise<boolean> => {
    setBusyId(key);
    setError(null);
    try {
      onChange?.(await request());
      return true;
    } catch (err: unknown) {
      console.error('Character effect change failed', err);
      setError(errorMessage(err, failure));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  // Снимаем без подтверждения: в игре это частое действие, а наложить снова — пара
  // кликов.
  const remove = (entry: CharacterEffectEntry) =>
    void run(
      entry.id,
      () => removeEffect(id, entry.id),
      'Не удалось снять эффект',
    );

  return (
    <Stack gap="xs">
      <Group gap="xs" aria-label="Наложенные эффекты">
        {effects.map((entry) => (
          <EffectBadge
            key={entry.id}
            entry={entry}
            busy={busyId === entry.id}
            onRemove={onChange && (() => remove(entry))}
          />
        ))}
        {onChange && (
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => setAdding(true)}
          >
            + Эффект
          </Button>
        )}
      </Group>
      {/* Ошибку наложения показывает само окно. */}
      {error && !adding && (
        <Alert
          color="red"
          variant="light"
          p="xs"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {adding && (
        <AddEffectDialog
          applied={effects}
          busy={busyId === 'add'}
          error={error}
          onApply={(effectId) =>
            run(
              'add',
              () => applyEffect(id, { effectId }),
              'Не удалось наложить эффект',
            )
          }
          onClose={() => {
            setAdding(false);
            setError(null);
          }}
        />
      )}
    </Stack>
  );
}

export default EffectsStrip;
