import { createContext, useContext } from 'react';
import type { SceneAttackTargets } from '../../../features/maps/MapScene';

// Цели атаки на сцене (docs/plan/combat.md, «Выбор цели»): список целей блока хода
// отдаёт странице, кого обвести красным и что делать по щелчку. Контекстом: список стоит
// во вкладке панели, а сцена — у страницы.
export const AttackTargetingContext = createContext<
  (targets: SceneAttackTargets | null) => void
>(() => undefined);

export const useAttackTargeting = () => useContext(AttackTargetingContext);
