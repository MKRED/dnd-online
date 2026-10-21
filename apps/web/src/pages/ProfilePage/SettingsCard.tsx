import {
  Alert,
  Card,
  Divider,
  Group,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { FACING_MARKERS, type FacingMarker, type UserSettings } from 'shared';
import { useAuth } from '../../features/auth';
import { updateSettings } from '../../features/profile';
import { errorMessage } from '../../lib/apiRequest';
import FacingMarkerPreview from './FacingMarkerPreview';
import GraphicsQualityField from './GraphicsQualityField';
import HealthMarkStyleField from './HealthMarkStyleField';

const MARKER_TEXT: Record<FacingMarker, { label: string; hint: string }> = {
  pointer: { label: 'Указатель', hint: 'Подставка вытянута носом по взгляду' },
  chevrons: { label: 'Шевроны', hint: 'Два шеврона у края подставки' },
  compass: { label: 'Компас', hint: 'Кольцо с засечками и стрелкой' },
};

// Настройки пользователя. Выбор сохраняется сразу, без кнопки: в контексте он
// меняется до ответа сервера, а при ошибке возвращается прежний.
function SettingsCard() {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const change = (patch: Partial<UserSettings>) => {
    const before = user;
    setUser({ ...user, settings: { ...user.settings, ...patch } });
    setSaving(true);
    setError(null);
    updateSettings(patch)
      .then((settings) => setUser({ ...before, settings }))
      .catch((err: unknown) => {
        console.error('Failed to save settings', err);
        setUser(before);
        setError(errorMessage(err, 'Не удалось сохранить настройку'));
      })
      .finally(() => setSaving(false));
  };

  return (
    <Card withBorder padding="lg">
      <Title order={3} mb="sm">
        Настройки
      </Title>
      <Radio.Group
        label="Взгляд на карте"
        description="Как подставки стартов и существ показывают, куда они смотрят"
        value={user.settings.facingMarker}
        onChange={(value) => change({ facingMarker: value })}
      >
        <SimpleGrid cols={{ base: 1, xs: 3 }} mt="xs">
          {FACING_MARKERS.map((marker) => (
            <Radio.Card
              key={marker}
              value={marker}
              disabled={saving}
              radius="md"
              p="sm"
            >
              <Group wrap="nowrap" gap="sm">
                <FacingMarkerPreview marker={marker} />
                <Stack gap={2}>
                  <Group gap={6} wrap="nowrap">
                    <Radio.Indicator size="xs" />
                    <Text fw={500}>{MARKER_TEXT[marker].label}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {MARKER_TEXT[marker].hint}
                  </Text>
                </Stack>
              </Group>
            </Radio.Card>
          ))}
        </SimpleGrid>
      </Radio.Group>
      <Divider my="md" />
      <GraphicsQualityField
        value={user.settings.graphicsQuality}
        disabled={saving}
        onChange={(graphicsQuality) => change({ graphicsQuality })}
      />
      <Divider my="md" />
      <HealthMarkStyleField
        value={user.settings.healthMarkStyle}
        disabled={saving}
        onChange={(healthMarkStyle) => change({ healthMarkStyle })}
      />
      {error && (
        <Alert color="red" mt="sm">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export default SettingsCard;
