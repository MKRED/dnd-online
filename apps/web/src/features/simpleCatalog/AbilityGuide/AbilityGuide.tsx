import {
  Accordion,
  ActionIcon,
  Container,
  Divider,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import GuideExample from './GuideExample';
import { GUIDE_EXAMPLES } from './guideExamples';
import {
  CategorySection,
  ChainSection,
  EffectsSection,
  GrowthSection,
  StepsSection,
  UsageSection,
} from './GuideSections';

const LABEL = 'Как заполнить способность';

// Гайд по форме способности — во весь экран поверх формы, а не отдельной страницей:
// закрыли — недописанная способность на месте. Меняется форма — обновите и гайд
// (docs/plan/done/abilities.md).
export function AbilityGuideButton() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <ActionIcon
        variant="light"
        size="md"
        radius="xl"
        style={{ flexShrink: 0 }}
        aria-label={LABEL}
        title={LABEL}
        onClick={open}
      >
        ?
      </ActionIcon>
      <Modal
        opened={opened}
        onClose={close}
        fullScreen
        title={
          <Title order={2} component="span">
            {LABEL}
          </Title>
        }
        closeButtonProps={{ 'aria-label': 'Закрыть гайд' }}
      >
        <Container size="md" px={0} pb="xl">
          <Stack gap="lg">
            <Text>
              Форма идёт сверху вниз: что это за способность, как её применяют и
              что она делает. Обязательно только название. Всё, чего форма пока
              не умеет — особые условия, выбор цели, — пишите в описании.
            </Text>
            <CategorySection />
            <UsageSection />
            <StepsSection />
            <EffectsSection />
            <ChainSection />
            <GrowthSection />
            <Divider />
            <Stack gap={6}>
              <Title order={3}>Примеры</Title>
              <Text>
                Каждый следующий добавляет одну новую мысль. Рядом с полями —
                какой выйдет карточка.
              </Text>
              <Accordion variant="separated">
                {GUIDE_EXAMPLES.map((example) => (
                  <GuideExample key={example.name} example={example} />
                ))}
              </Accordion>
            </Stack>
          </Stack>
        </Container>
      </Modal>
    </>
  );
}
