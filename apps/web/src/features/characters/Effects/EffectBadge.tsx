import { Anchor, Badge, Box, CloseButton, Text, Tooltip } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { CharacterEffectEntry } from 'shared';
import { CatalogThumb } from '../../catalog';
import { effectsCatalog } from './effectsApi';
import { effectEntryHint, effectEntryName } from './effectsView';
import classes from './Effects.module.css';

interface EffectBadgeProps {
  entry: CharacterEffectEntry;
  // Есть — автор может снять эффект; нет — лист только для чтения.
  onRemove?: () => void;
  busy: boolean;
}

// Плашка эффекта: миниатюра, название — ссылка на карточку, у автора крестик «Снять».
// Подсказка — длительность из карточки. Скрытый, удалённый или не действующий эффект —
// серая плашка: на лист он не влияет.
function EffectBadge({ entry, onRemove, busy }: EffectBadgeProps) {
  const { effect } = entry;
  const name = effectEntryName(entry);
  const acting = effect !== null && !entry.inactive;

  return (
    <Badge
      size="lg"
      radius="sm"
      variant="light"
      color={acting ? 'grape' : 'gray'}
      className={classes.badge}
      opacity={busy ? 0.6 : 1}
      leftSection={
        effect && (
          <Box w={20} className={classes.thumb}>
            <CatalogThumb
              entry={effect}
              imagePath={effectsCatalog.imagePath}
              placeholderSize="0.7rem"
            />
          </Box>
        )
      }
      rightSection={
        onRemove && (
          <CloseButton
            size="xs"
            aria-label={`Снять «${name}»`}
            disabled={busy}
            onClick={onRemove}
          />
        )
      }
    >
      <Tooltip label={effectEntryHint(entry)} multiline maw={260} withArrow>
        {effect ? (
          <Anchor
            component={Link}
            to={`/effects/${effect.id}`}
            inherit
            c="inherit"
            td={entry.inactive ? 'line-through' : undefined}
          >
            {name}
          </Anchor>
        ) : (
          <Text span inherit fs="italic">
            {name}
          </Text>
        )}
      </Tooltip>
    </Badge>
  );
}

export default EffectBadge;
