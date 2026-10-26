import { Alert, Button, Group, PasswordInput, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { validatePassword } from '../../../features/auth';
import { changePassword } from '../../../features/profile';
import { errorMessage } from '../../../lib/apiRequest';

interface Values {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordFormProps {
  onDone: () => void;
  onCancel: () => void;
}

// Смена пароля в раскрытой строке «Пароль»: после успеха строка сворачивается сама.
function ChangePasswordForm({ onDone, onCancel }: ChangePasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
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
    setSaving(true);
    changePassword({ currentPassword, newPassword })
      .then(onDone)
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
        <PasswordInput
          label="Текущий пароль"
          required
          autoFocus
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
        <Group gap="xs">
          <Button type="submit" loading={saving}>
            Сменить пароль
          </Button>
          <Button variant="default" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default ChangePasswordForm;
