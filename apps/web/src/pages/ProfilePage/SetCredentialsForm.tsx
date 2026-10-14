import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { validateLogin, validatePassword } from '../../features/auth';
import { setCredentials, type Profile } from '../../features/profile';
import { errorMessage } from '../../lib/apiRequest';

interface Values {
  login: string;
  password: string;
  confirmPassword: string;
}

// Аккаунт из лольки без пароля: задать логин и пароль, чтобы входить и без неё.
function SetCredentialsForm({
  onSaved,
}: {
  onSaved: (profile: Profile) => void;
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
        <Text size="sm" c="dimmed">
          Сейчас вы входите только через лольку. Задайте логин и пароль, чтобы
          входить и без неё.
        </Text>
        {error && (
          <Alert color="red" title="Ошибка">
            {error}
          </Alert>
        )}
        <TextInput
          label="Логин"
          placeholder="Латинские буквы, цифры и _"
          required
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
        <Button
          type="submit"
          loading={saving}
          style={{ alignSelf: 'flex-start' }}
        >
          Сохранить логин и пароль
        </Button>
      </Stack>
    </form>
  );
}

export default SetCredentialsForm;
