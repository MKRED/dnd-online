import { Button, Text } from '@mantine/core';
import { useState } from 'react';
import type { Profile } from '../../../features/profile';
import ChangePasswordForm from './ChangePasswordForm';
import SetCredentialsForm from './SetCredentialsForm';
import { SavedNotice, SettingRow } from './SettingRow';

// Пароль: «Сменить» раскрывает строку в форму смены. У аккаунта из лольки без пароля
// вместо неё строка «Логин и пароль» с «Задать»: без них войти можно только через лольку.
function PasswordRow({
  profile,
  onCredentialsSaved,
}: {
  profile: Profile;
  onCredentialsSaved: (profile: Profile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!profile.hasPassword)
    return open ? (
      <SettingRow label="Логин и пароль" open>
        <SetCredentialsForm
          onSaved={(saved) => {
            onCredentialsSaved(saved);
            setNotice('Логин и пароль сохранены');
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </SettingRow>
    ) : (
      <SettingRow
        label="Логин и пароль"
        hint="Сейчас вы входите только через лольку. Задайте их, чтобы входить и без неё"
        action={
          <Button variant="default" onClick={() => setOpen(true)}>
            Задать
          </Button>
        }
      >
        <Text c="dimmed">Не заданы</Text>
      </SettingRow>
    );

  if (open)
    return (
      <SettingRow label="Пароль" open>
        <ChangePasswordForm
          onDone={() => {
            setNotice('Пароль изменён');
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </SettingRow>
    );

  return (
    <SettingRow
      label="Пароль"
      hint={notice && <SavedNotice>{notice}</SavedNotice>}
      action={
        <Button
          variant="default"
          onClick={() => {
            setNotice(null);
            setOpen(true);
          }}
        >
          Сменить
        </Button>
      }
    >
      <Text style={{ letterSpacing: '0.2em' }}>••••••••</Text>
    </SettingRow>
  );
}

export default PasswordRow;
