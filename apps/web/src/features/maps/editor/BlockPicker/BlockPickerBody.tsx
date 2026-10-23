import { Stack, Text } from '@mantine/core';
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
} from './blockGroups';
import BlockTile from './BlockTile';
import { useBlockCatalog } from './catalogContext';
import OwnBlocksSection from './OwnBlocksSection';
import PickerSection from './PickerSection';

interface BlockPickerBodyProps {
  // Текущий блок: с его материала или группы окно и открывается.
  block: string;
  onPick: (block: string) => void;
}

const GROUPS = materialGroups();

// Вкладка «Блоки» окна «Что поставить» (docs/web.md, «BlockPicker»; поиск и недавние —
// у окна): свои блоки, материалы по группам и формы выбранного. Клик по форме выбирает
// её; двойной клик по материалу или своей группе берёт её в той же форме, что сейчас.
// Монтируется на время показа — каждый раз открывается с текущего блока.
function BlockPickerBody({ block, onPick }: BlockPickerBodyProps) {
  const catalog = useBlockCatalog();
  const current = catalog.describe(block);
  // Выбранный ряд: имя материала или id своей группы — они не пересекаются (в uuid
  // нет латинских слов-материалов).
  const [selected, setSelected] = useState<string>(
    parseCustomBlockName(block)?.groupId ?? current?.material ?? 'stone',
  );
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

  return (
    <Stack gap="md">
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
    </Stack>
  );
}

export default BlockPickerBody;
