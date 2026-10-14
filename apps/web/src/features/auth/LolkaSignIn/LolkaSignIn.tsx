import { Button, Divider } from '@mantine/core';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../lib/apiBaseUrl';
import { getAuthProviders } from '../authApi';
import classes from './LolkaSignIn.module.css';
import lolkaIcon from './lolka-icon.webp';

// «или — Войти через лольку» под формой входа и регистрации. Первый вход сразу
// создаёт аккаунт, поэтому на обеих страницах одна и та же кнопка.
function LolkaSignIn() {
  const [enabled, setEnabled] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    getAuthProviders()
      .then((providers) => setEnabled(providers.lolka))
      // Без ответа кнопку просто не показываем: вход по паролю работает и так.
      .catch((err: unknown) =>
        console.error('Failed to load auth providers', err),
      );
  }, []);

  // Вернулись кнопкой «Назад» со страницы лольки — страница могла восстановиться
  // из кеша браузера с крутящейся кнопкой.
  useEffect(() => {
    const reset = () => setLeaving(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Divider label="или" labelPosition="center" my="lg" />
      {/* Обычная ссылка, а не fetch: дальше браузер уходит на лольку и обратно. */}
      <Button
        component="a"
        href={`${API_BASE_URL}/auth/lolka/start`}
        // Фирменная бирюза с иконки лольки. Светлый край взят темнее, чем на иконке:
        // белый текст на нём должен читаться (контраст не ниже 4.5).
        variant="gradient"
        gradient={{ from: '#15798b', to: '#0e4f5e', deg: 135 }}
        leftSection={<img src={lolkaIcon} alt="" className={classes.icon} />}
        fullWidth
        loading={leaving}
        onClick={() => setLeaving(true)}
      >
        Войти через лольку
      </Button>
    </>
  );
}

export default LolkaSignIn;
