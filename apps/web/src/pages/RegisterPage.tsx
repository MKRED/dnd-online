import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AuthApiError,
  registerUser,
  useAuth,
  validateLogin,
  validateNickname,
  validatePassword,
} from '../features/auth';
import { usePageTitle } from '../lib/usePageTitle';

interface RegisterFormValues {
  login: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}

function RegisterPage() {
  usePageTitle('Регистрация');
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    initialValues: {
      login: '',
      nickname: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      login: validateLogin,
      nickname: validateNickname,
      password: validatePassword,
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Пароли не совпадают',
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    setSubmitError(null);
    setSubmitting(true);
    registerUser({
      login: values.login,
      nickname: values.nickname,
      password: values.password,
    })
      .then(({ user }) => {
        setUser(user);
        void navigate('/');
      })
      .catch((err: unknown) => {
        console.error('Registration failed', err);
        const message =
          err instanceof AuthApiError
            ? err.message
            : 'Не удалось зарегистрироваться';
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
  });

  return (
    <Container size={420} my={40}>
      <Title order={2} ta="center">
        Создать аккаунт
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Уже есть аккаунт?{' '}
        <Anchor component={Link} to="/login" size="sm">
          Войти
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {submitError && (
              <Alert color="red" title="Ошибка регистрации">
                {submitError}
              </Alert>
            )}
            <TextInput
              label="Логин"
              placeholder="Ваш логин"
              required
              {...form.getInputProps('login')}
            />
            <TextInput
              label="Ник"
              placeholder="Отображаемое имя"
              required
              {...form.getInputProps('nickname')}
            />
            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              {...form.getInputProps('password')}
            />
            <PasswordInput
              label="Повторите пароль"
              placeholder="Ваш пароль ещё раз"
              required
              {...form.getInputProps('confirmPassword')}
            />
          </Stack>
          <Button type="submit" fullWidth mt="xl" loading={submitting}>
            Зарегистрироваться
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default RegisterPage;
