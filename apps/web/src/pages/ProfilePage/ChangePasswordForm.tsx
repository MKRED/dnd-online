import { Alert, Button, PasswordInput, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { validatePassword } from '../../features/auth';
import { changePassword } from '../../features/profile';
import { errorMessage } from '../../lib/apiRequest';

interface Values {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (value) => (value ? null : 'Введите текущий пароль'),
      newPassword: validatePassword,
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : 'Пароли не совпадают',
    },
  });

  const handleSubmit = form.onSubmit(({ currentPassword, newPassword }) => {
    setError(null);
    setDone(false);
    setSaving(true);
    changePassword({ currentPassword, newPassword })
      .then(() => {
        setDone(true);
        form.reset();
      })
      .catch((err: unknown) => {
        console.error('Failed to change password', err);
        setError(errorMessage(err, 'Не удалось сменить пароль'));
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
        {done && <Alert color="green">Пароль изменён.</Alert>}
        <PasswordInput
          label="Текущий пароль"
          required
          autoComplete="current-password"
          {...form.getInputProps('currentPassword')}
        />
        <PasswordInput
          label="Новый пароль"
          required
          autoComplete="new-password"
          {...form.getInputProps('newPassword')}
        />
        <PasswordInput
          label="Повторите новый пароль"
          required
          autoComplete="new-password"
          {...form.getInputProps('confirmPassword')}
        />
        <Button
          type="submit"
          loading={saving}
          style={{ alignSelf: 'flex-start' }}
        >
          Сменить пароль
        </Button>
      </Stack>
    </form>
  );
}

export default ChangePasswordForm;
