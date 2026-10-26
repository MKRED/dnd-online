import { useId, type ReactNode } from 'react';
import classes from './ScenePanel.module.css';

interface SceneGroupProps {
  title: string;
  // Выделить рамку: «Бой», пока он идёт.
  hot?: boolean;
  children: ReactNode;
}

// Группа кнопок во вкладке «Сцена» (замечания после первой партии, 2026-10-26, вариант Б):
// рамка с подписью, по которой группу находят и глазами, и скринридером.
function SceneGroup({ title, hot = false, children }: SceneGroupProps) {
  const id = useId();
  return (
    <section
      className={hot ? `${classes.group} ${classes.groupHot}` : classes.group}
      aria-labelledby={id}
    >
      <h3 id={id} className={classes.groupTitle}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export default SceneGroup;
