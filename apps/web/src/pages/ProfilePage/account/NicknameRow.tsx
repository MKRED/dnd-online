import { Button, Group, Text, TextInput } from '@mantine/core';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { normalizeNickname } from 'shared';
import { useAuth, validateNickname } from '../../../features/auth';
import { changeNickname, type Profile } from '../../../features/profile';
import { errorMessage } from '../../../lib/apiRequest';
import { SavedNotice, SettingRow } from './SettingRow';

const HINT =
  'Виден в шапке, в лобби, в журнале игры и у ваших записей в каталоге';

// Ник: «Изменить» раскрывает строку в поле. Enter сохраняет, Esc отменяет; после
// сохранения ник сразу меняется и в шапке (пользователь в AuthContext).
function NicknameRow({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (profile: Profile) => void;
}) {
  const { user, setUser } = useAuth();
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);

  const open = () => {
    setValue(profile.nickname);
    setError(null);
    setSaved(false);
  };
  // Фокус возвращается на «Изменить», чтобы с клавиатуры не терять место.
  const close = () => {
    setValue(null);
    setError(null);
    requestAnimationFrame(() => editButton.current?.focus());
  };

  const save = () => {
    if (value === null || saving) return;
    const problem = validateNickname(value);
    if (problem) return setError(problem);
    if (normalizeNickname(value) === profile.nickname) return close();
    setSaving(true);
    setError(null);
    changeNickname(value)
      .then((next) => {
        onSaved(next);
        if (user) setUser({ ...user, nickname: next.nickname });
        setSaved(true);
        close();
      })
      .catch((err: unknown) => {
        console.error('Failed to change nickname', err);
        setError(errorMessage(err, 'Не удалось сменить ник'));
      })
      .finally(() => setSaving(false));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save();
  };
  // Esc — с любого места формы: после нажатия «Сохранить» фокус уже на кнопке.
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || saving) return;
    event.preventDefault();
    close();
  };

  if (value === null)
    return (
      <SettingRow
        label="Ник"
        hint={saved ? <SavedNotice>Ник изменён</SavedNotice> : HINT}
        action={
          <Button ref={editButton} variant="default" onClick={open}>
            Изменить
          </Button>
        }
      >
        <Text fw={600} size="lg" style={{ overflowWrap: 'anywhere' }}>
          {profile.nickname}
        </Text>
      </SettingRow>
    );

  return (
    <SettingRow label="Ник" labelFor="profile-nickname" open>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <TextInput
          id="profile-nickname"
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          // Ошибка встаёт на место подсказки: две строки мелкого текста подряд читаются хуже.
          description={
            error
              ? undefined
              : 'От 2 до 32 знаков. Enter — сохранить, Esc — отмена'
          }
          inputWrapperOrder={['input', 'description', 'error']}
          error={error}
          disabled={saving}
          autoFocus
        />
        <Group gap="xs" mt="sm">
          <Button type="submit" loading={saving}>
            Сохранить
          </Button>
          <Button variant="default" onClick={close} disabled={saving}>
            Отмена
          </Button>
        </Group>
      </form>
    </SettingRow>
  );
}

export default NicknameRow;
