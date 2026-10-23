import { Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import {
  customBlockName,
  MATERIALS,
  parseCustomBlockName,
  SHAPE_LABELS,
  type MaterialName,
} from 'shared';
import { blockTraits } from '../blockTraits';
import {
  blocksOf,
  materialGroups,
  ownBlocksOf,
  ownGroups,
  searchBlocks,
} from './blockGroups';
import BlockTile from './BlockTile';
import { useBlockCatalog } from './catalogContext';
import OwnBlocksSection from './OwnBlocksSection';
import PickerSection from './PickerSection';
import { shownRecent } from './recentBlocks';
import classes from './BlockPicker.module.css';

interface BlockPickerModalProps {
  // Текущий блок: с его материала или группы окно и открывается.
  block: string;
  recent: readonly string[];
  onPick: (block: string) => void;
  onClose: () => void;
}

const GROUPS = materialGroups();

// Окно выбора блока (docs/web.md, «BlockPicker»): поиск, недавние, свои блоки, материалы
// по группам и формы выбранного. Клик по форме, недавнему или найденному блоку выбирает
// его и закрывает окно; двойной клик по материалу или своей группе берёт её в той же
// форме, что сейчас. Монтируется только на время показа — каждый раз открывается с
// текущего блока.
function BlockPickerModal({
  block,
  recent,
  onPick,
  onClose,
}: BlockPickerModalProps) {
  const catalog = useBlockCatalog();
  const current = catalog.describe(block);
  // Выбранный ряд: имя материала или id своей группы — они не пересекаются (в uuid
  // нет латинских слов-материалов).
  const [selected, setSelected] = useState<string>(
    parseCustomBlockName(block)?.groupId ?? current?.material ?? 'stone',
  );
  const [query, setQuery] = useState('');
  // Ряд форм под материалами: на телефоне он ниже экрана — после выбора прокручиваем
  // к нему, иначе непонятно, что делать дальше.
  const shapesRef = useRef<HTMLDivElement>(null);
  const choose = (key: string) => {
    setSelected(key);
    shapesRef.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: 'smooth',
    });
  };
  const groups = ownGroups(catalog);
  const group = groups.find((g) => g.id === selected);
  const found = searchBlocks(query, catalog);
  const shapes = group
    ? ownBlocksOf(catalog, group.id)
    : blocksOf(selected as MaterialName);
  const shape = current?.shape ?? 'cube';
  const sameShape = (key: string) =>
    groups.some((g) => g.id === key)
      ? customBlockName(key, shape)
      : (blocksOf(key as MaterialName).find((b) => b.shape === shape)?.name ??
        key);
  // Куб своей группы называется её id, базового — именем материала.
  const traits = blockTraits(selected, catalog);
  const recentShown = shownRecent(recent, catalog);

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
            {recentShown.length > 0 && (
              <PickerSection title="Недавние">
                {recentShown.map((name) => (
                  <BlockTile
                    key={name}
                    block={name}
                    label={catalog.describe(name)?.label ?? name}
                    selected={name === block}
                    onClick={() => onPick(name)}
                  />
                ))}
              </PickerSection>
            )}

            <OwnBlocksSection
              groups={groups}
              selected={selected}
              onChoose={choose}
              onPickSameShape={(id) => onPick(sameShape(id))}
            />

            {GROUPS.map((materials) => (
              <PickerSection key={materials.label} title={materials.label}>
                {materials.materials.map((name) => (
                  <BlockTile
                    key={name}
                    block={name}
                    label={MATERIALS[name].label}
                    selected={name === selected}
                    onClick={() => choose(name)}
                    onDoubleClick={() => onPick(sameShape(name))}
                  />
                ))}
              </PickerSection>
            ))}

            <PickerSection
              title={`Форма — ${group?.name ?? MATERIALS[selected as MaterialName].label}`}
              sectionRef={shapesRef}
            >
              {shapes.map((b) => (
                <BlockTile
                  key={b.name}
                  block={b.name}
                  label={SHAPE_LABELS[b.shape]}
                  selected={b.name === block}
                  onClick={() => onPick(b.name)}
                />
              ))}
            </PickerSection>
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

export default BlockPickerModal;
