import { Box, Tooltip } from '@mantine/core';

// Точка присутствия: зелёная — человек сейчас в лобби, серая — нет. Подпись — в
// подсказке и для скринридера.
function OnlineDot({ online }: { online: boolean }) {
  const label = online ? 'В лобби' : 'Не в лобби';
  return (
    <Tooltip label={label} withArrow>
      <Box
        component="span"
        role="img"
        aria-label={label}
        w={8}
        h={8}
        bg={online ? 'green.6' : 'gray.5'}
        style={{
          borderRadius: '50%',
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

export default OnlineDot;
