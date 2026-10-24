import {
  Alert,
  Button,
  Group,
  PasswordInput,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { validateLogin, validatePassword } from '../../../features/auth';
import { setCredentials, type Profile } from '../../../features/profile';
import { errorMessage } from '../../../lib/apiRequest';

interface Values {
  login: string;
  password: string;
  confirmPassword: string;
}

// Аккаунт из лольки без пароля: задать логин и пароль, чтобы входить и без неё.
// Открывается в строке «Логин и пароль» раздела «Аккаунт».
function SetCredentialsForm({
  onSaved,
  onCancel,
}: {
  onSaved: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    initialValues: { login: '', password: '', confirmPassword: '' },
    validate: {
      login: validateLogin,
      password: validatePassword,
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Пароли не совпадают',
    },
  });

  const handleSubmit = form.onSubmit(({ login, password }) => {
    setError(null);
    setSaving(true);
    setCredentials({ login, password })
      .then(onSaved)
      .catch((err: unknown) => {
        console.error('Failed to set credentials', err);
        setError(errorMessage(err, 'Не удалось сохранить логин и пароль'));
      })
      .finally(() => setSaving(false));
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        {error && (
          <Alert color="red" title="Ошибка">
            {error}
          </Alert>
        )}
        <TextInput
          label="Логин"
          placeholder="Латинские буквы, цифры и _"
          required
          autoFocus
          autoComplete="username"
          {...form.getInputProps('login')}
        />
        <PasswordInput
          label="Пароль"
          required
          autoComplete="new-password"
          {...form.getInputProps('password')}
        />
        <PasswordInput
          label="Повторите пароль"
          required
          autoComplete="new-password"
          {...form.getInputProps('confirmPassword')}
        />
        <Group gap="xs">
          <Button type="submit" loading={saving}>
            Сохранить логин и пароль
          </Button>
          <Button variant="default" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default SetCredentialsForm;
