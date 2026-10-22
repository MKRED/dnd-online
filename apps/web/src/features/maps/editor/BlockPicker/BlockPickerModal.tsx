import { Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { getBlock, MATERIALS, SHAPE_LABELS, type MaterialName } from 'shared';
import { blockTraits } from '../blockTraits';
import { blocksOf, materialGroups, searchBlocks } from './blockGroups';
import BlockTile from './BlockTile';
import classes from './BlockPicker.module.css';

interface BlockPickerModalProps {
  // Текущий блок: с его материала окно и открывается.
  block: string;
  recent: readonly string[];
  onPick: (block: string) => void;
  onClose: () => void;
}

const GROUPS = materialGroups();

// Окно выбора блока (docs/web.md, «BlockPicker»): поиск, недавние, материалы по группам
// и формы выбранного материала. Клик по форме, недавнему или найденному блоку выбирает
// его и закрывает окно; двойной клик по материалу берёт его в той же форме, что сейчас.
// Монтируется только на время показа — каждый раз открывается с текущего блока.
function BlockPickerModal({
  block,
  recent,
  onPick,
  onClose,
}: BlockPickerModalProps) {
  const current = getBlock(block);
  const [material, setMaterial] = useState<MaterialName>(
    current?.material ?? 'stone',
  );
  const [query, setQuery] = useState('');
  const found = searchBlocks(query);
  const shapes = blocksOf(material);
  const sameShape = (name: MaterialName) =>
    blocksOf(name).find((b) => b.shape === current?.shape)?.name ?? name;
  const traits = blockTraits(material);

  return (
    <Modal opened onClose={onClose} title="Выбор блока" size="lg">
      <Stack gap="md">
        <TextInput
          data-autofocus
          placeholder="Поиск: камень, ступени, кам плит…"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && found[0]) onPick(found[0].name);
          }}
          aria-label="Поиск блока"
        />

        {query.trim() ? (
          found.length ? (
            <div className={classes.grid}>
              {found.map((b) => (
                <BlockTile
                  key={b.name}
                  block={b.name}
                  label={b.label}
                  selected={b.name === block}
                  onClick={() => onPick(b.name)}
                />
              ))}
            </div>
          ) : (
            <Text size="sm" c="dimmed">
              Ничего не нашлось.
            </Text>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <Section title="Недавние">
                {recent.map((name) => (
                  <BlockTile
                    key={name}
                    block={name}
                    label={getBlock(name)?.label ?? name}
                    selected={name === block}
                    onClick={() => onPick(name)}
                  />
                ))}
              </Section>
            )}

            {GROUPS.map((group) => (
              <Section key={group.label} title={group.label}>
                {group.materials.map((name) => (
                  <BlockTile
                    key={name}
                    block={name}
                    label={MATERIALS[name].label}
                    selected={name === material}
                    onClick={() => setMaterial(name)}
                    onDoubleClick={() => onPick(sameShape(name))}
                  />
                ))}
              </Section>
            ))}

            <Section title={`Форма — ${MATERIALS[material].label}`}>
              {shapes.map((b) => (
                <BlockTile
                  key={b.name}
                  block={b.name}
                  label={SHAPE_LABELS[b.shape]}
                  selected={b.name === block}
                  onClick={() => onPick(b.name)}
                />
              ))}
            </Section>
            {traits && (
              <Text size="xs" c="orange">
                {traits}
              </Text>
            )}
          </>
        )}
      </Stack>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {title}
      </Text>
      <div className={classes.grid}>{children}</div>
    </Stack>
  );
}

export default BlockPickerModal;
