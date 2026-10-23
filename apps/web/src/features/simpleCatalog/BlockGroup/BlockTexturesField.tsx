import { Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import type { BlockTextures, ShapeName } from 'shared';
import { decodeTextures, meanTextureColor } from '../../maps';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import ShapeTabs from './ShapeTabs';
import TextureSetEditor from './TextureSetEditor';

// Свои текстуры группы и её отдельных форм (docs/plan/blocks.md, этапы 4б, 5 и 5б).
// «Блок» — текстуры группы: их берут все формы без своего вида. У формы свой вид —
// свои плитки и основной цвет (средний цвет плиток); «Как у блока» его убирает.
function BlockTexturesField({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const [shape, setShape] = useState<ShapeName>('cube');
  const block = form.getValues().block;

  const groupTextures = () => form.getValues().block.textures;
  const shapeTextures = () =>
    shape === 'cube'
      ? groupTextures()
      : (form.getValues().block.shapes[shape]?.textures ?? null);

  const change = (textures: BlockTextures | null, recolor: boolean) => {
    if (shape === 'cube') {
      form.setFieldValue('block.textures', textures);
      if (textures && recolor)
        form.setFieldValue(
          'block.color',
          meanTextureColor(decodeTextures(textures)),
        );
      return;
    }
    const rest = { ...form.getValues().block.shapes };
    delete rest[shape];
    form.setFieldValue(
      'block.shapes',
      textures
        ? {
            ...rest,
            [shape]: {
              textures,
              color: meanTextureColor(decodeTextures(textures)),
            },
          }
        : rest,
    );
  };

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Текстуры
      </Text>
      <ShapeTabs group={block} value={shape} onChange={setShape} />
      {/* key: у каждой формы свой выбор способа и свои ошибки. */}
      <TextureSetEditor
        key={shape}
        shape={shape}
        patternLabel={shape === 'cube' ? 'Узор основы' : 'Как у блока'}
        getTextures={shapeTextures}
        startFrom={() => (shape === 'cube' ? null : groupTextures())}
        look={block.look}
        color={block.color}
        onChange={change}
      />
    </Stack>
  );
}

export default BlockTexturesField;
