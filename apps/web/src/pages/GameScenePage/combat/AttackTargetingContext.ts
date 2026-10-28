import { createContext, useContext } from 'react';
import type { SceneAttackTargets } from '../../../features/maps/MapScene';

// Цели атаки на сцене (docs/plan/combat.md, «Выбор цели после этапа 5»): блок хода
// отдаёт странице строки над целями, выбранную цель, луч и что делать по щелчку.
// Контекстом: блок стоит во вкладке панели, а сцена — у страницы.
export const AttackTargetingContext = createContext<
  (targets: SceneAttackTargets | null) => void
>(() => undefined);

export const useAttackTargeting = () => useContext(AttackTargetingContext);
