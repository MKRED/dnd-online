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
  loginUser,
  useAuth,
  validateLogin,
  validatePassword,
} from '../features/auth';

interface LoginFormValues {
  login: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    initialValues: { login: '', password: '' },
    validate: {
      login: validateLogin,
      password: validatePassword,
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    setSubmitError(null);
    setSubmitting(true);
    loginUser(values)
      .then(({ user }) => {
        setUser(user);
        void navigate('/');
      })
      .catch((err: unknown) => {
        console.error('Login failed', err);
        const message =
          err instanceof AuthApiError ? err.message : 'Не удалось войти';
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
  });

  return (
    <Container size={420} my={40}>
      <Title ta="center">С возвращением!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Ещё нет аккаунта?{' '}
        <Anchor component={Link} to="/register" size="sm">
          Зарегистрироваться
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {submitError && (
              <Alert color="red" title="Ошибка входа">
                {submitError}
              </Alert>
            )}
            <TextInput
              label="Логин"
              placeholder="Ваш логин"
              required
              {...form.getInputProps('login')}
            />
            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              {...form.getInputProps('password')}
            />
          </Stack>
          <Button type="submit" fullWidth mt="xl" loading={submitting}>
            Войти
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default LoginPage;
