import { Card, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import classes from './SettingRow.module.css';

interface SettingRowProps {
  label: string;
  // id поля открытой формы: название строки становится его подписью.
  labelFor?: string;
  hint?: ReactNode;
  action?: ReactNode;
  // Строка раскрыта в форму: название выравнивается по первому полю.
  open?: boolean;
  children?: ReactNode;
}

// Строка раздела «Аккаунт»: название, значение и действие справа. Кнопка раскрывает
// строку в форму на месте, без окна: видно, что именно меняешь.
export function SettingRow({
  label,
  labelFor,
  hint,
  action,
  open = false,
  children,
}: SettingRowProps) {
  return (
    <div className={open ? `${classes.row} ${classes.open}` : classes.row}>
      {labelFor ? (
        <label htmlFor={labelFor} className={classes.key}>
          {label}
        </label>
      ) : (
        <span className={classes.key}>{label}</span>
      )}
      <div className={classes.value}>
        {children}
        {hint && (
          <Text size="sm" c="dimmed" mt={2}>
            {hint}
          </Text>
        )}
      </div>
      {action && <div className={classes.action}>{action}</div>}
    </div>
  );
}

// Карточка строк с подписью сверху: «Для других игроков», «Вход».
export function SettingsGroup({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <Card
      withBorder
      padding={0}
      radius="md"
      className={classes.group}
      component="section"
      aria-label={caption}
    >
      <div className={classes.caption}>{caption}</div>
      {children}
    </Card>
  );
}

// Подсказка строки после сохранения: «Ник изменён» с галочкой.
export function SavedNotice({ children }: { children: ReactNode }) {
  return (
    <Text
      span
      size="sm"
      c="green"
      role="status"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <IconCheck size={14} stroke={2.4} />
      {children}
    </Text>
  );
}
