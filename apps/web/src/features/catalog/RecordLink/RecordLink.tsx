import { Anchor, type AnchorProps } from '@mantine/core';
import { useContext, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  RECORD_PATHS,
  RecordLinkContext,
  type RecordKind,
} from './recordLinkContext';
import classes from './RecordLink.module.css';

interface RecordLinkProps extends AnchorProps {
  // Обёртки вроде Tooltip подмешивают свои обработчики — свой щелчок их не затирает.
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  kind: RecordKind;
  id: string;
  // Имя записи — подпись окна, пока она грузится.
  name: string;
  title?: string;
  children: ReactNode;
}

// Ссылка на способность, эффект или предмет из листа или карточки. На сцене игры она
// открывает окно записи (RecordLinkContext), иначе — страницу записи.
function RecordLink({
  kind,
  id,
  name,
  children,
  onClick,
  className,
  ...props
}: RecordLinkProps) {
  const open = useContext(RecordLinkContext);
  if (!open) {
    return (
      <Anchor
        component={Link}
        to={`${RECORD_PATHS[kind]}/${id}`}
        onClick={onClick}
        className={className}
        {...props}
      >
        {children}
      </Anchor>
    );
  }
  return (
    <Anchor
      component="button"
      type="button"
      {...props}
      className={className ? `${classes.button} ${className}` : classes.button}
      onClick={(event: MouseEvent<HTMLElement>) => {
        onClick?.(event);
        open(kind, id, name);
      }}
    >
      {children}
    </Anchor>
  );
}

export default RecordLink;
