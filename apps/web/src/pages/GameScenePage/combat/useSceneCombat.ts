import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AttackKey,
  AttackTarget,
  CombatAbilityInput,
  CombatAction,
  CombatAttackInput,
  CombatantInput,
  CombatResourcesInput,
  D20Roll,
  GameCombat,
  GameCombatAttack,
  GameCombatDamage,
  RollMode,
  WeaponSet,
} from 'shared';
import { combatApi, getGameCombat } from '../../../features/games';
import { ApiError, errorMessage } from '../../../lib/apiRequest';

// Бой с очерёдностью на активной сцене (docs/plan/combat.md, этап 3): очередь, как её видит
// смотрящий, и правки. Перечитывается целиком после записей боя, как фигурки; ответ старше
// уже показанного (по номеру журнала) не откатывает очередь назад.
export function useSceneCombat(gameId: string, sceneId: string | null) {
  const [loaded, setLoaded] = useState<GameCombat | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(-1);
  const api = useMemo(() => combatApi(gameId), [gameId]);

  const apply = useCallback((result: GameCombat) => {
    if (result.eventSeq < seqRef.current) return;
    seqRef.current = result.eventSeq;
    setLoaded(result);
  }, []);

  const reload = useCallback(() => {
    if (!sceneId) return;
    getGameCombat(gameId)
      .then(apply)
      .catch((err: unknown) => {
        // Сцену закрыли или сменили — это перечитает сама страница сцены.
        if (err instanceof ApiError && [403, 404].includes(err.status)) return;
        console.error('Failed to load scene combat', err);
      });
  }, [gameId, sceneId, apply]);

  useEffect(reload, [reload]);

  // Правки по одной: пока запрос в пути, новые не принимаются.
  const run = useCallback(
    (request: () => Promise<GameCombat>, failure: string) => {
      if (busy) return Promise.resolve(false);
      setBusy(true);
      setError(null);
      return request()
        .then((result) => {
          apply(result);
          return true;
        })
        .catch((err: unknown) => {
          console.error(failure, err);
          setError(errorMessage(err, failure));
          return false;
        })
        .finally(() => setBusy(false));
    },
    [busy, apply],
  );

  // Бросок для окна броска: ошибку показывает само окно, поэтому она пробрасывается.
  const roll = useCallback(
    async (combatantId: string, mode: RollMode | null): Promise<D20Roll> => {
      const result = await api.roll(combatantId, mode);
      apply(result.combat);
      return result.roll;
    },
    [api, apply],
  );

  // Атака и урон для окна броска (этап 5): ошибку показывает окно, очередь — сразу.
  const attack = useCallback(
    async (
      combatantId: string,
      input: CombatAttackInput,
    ): Promise<GameCombatAttack> => {
      const result = await api.attack(combatantId, input);
      apply(result.combat);
      return result;
    },
    [api, apply],
  );
  const damage = useCallback(
    async (combatantId: string): Promise<GameCombatDamage> => {
      const result = await api.damage(combatantId);
      apply(result.combat);
      return result;
    },
    [api, apply],
  );
  const targets = useCallback(
    (combatantId: string, key: AttackKey): Promise<AttackTarget[]> =>
      api.targets(combatantId, key),
    [api],
  );

  const current = loaded?.sceneId === sceneId ? loaded : null;
  return {
    combat: current,
    reload,
    busy,
    error,
    clearError: () => setError(null),
    roll,
    attack,
    damage,
    targets,
    start: (participants: CombatantInput[]) =>
      run(() => api.start(participants), 'Не удалось начать бой'),
    join: (participants: CombatantInput[]) =>
      run(() => api.join(participants), 'Не удалось позвать в бой'),
    leave: (id: string) => run(() => api.leave(id), 'Не удалось убрать из боя'),
    rollCreatures: () =>
      run(() => api.rollCreatures(), 'Не удалось бросить за монстров'),
    rollHeroes: () =>
      run(() => api.rollHeroes(), 'Не удалось бросить за героев'),
    setInitiative: (id: string, value: number) =>
      run(
        () => api.setInitiative(id, value),
        'Не удалось поправить инициативу',
      ),
    reorder: (ids: string[]) =>
      run(() => api.reorder(ids), 'Не удалось переставить очередь'),
    endTurn: (id: string) =>
      run(() => api.endTurn(id), 'Не удалось закончить ход'),
    passTurn: (id: string) =>
      run(() => api.passTurn(id), 'Не удалось передать ход'),
    takeAction: (id: string, action: CombatAction) =>
      run(() => api.takeAction(id, action), 'Не удалось сделать действие'),
    setResources: (id: string, input: CombatResourcesInput) =>
      run(
        () => api.setResources(id, input),
        'Не удалось поправить потраченное',
      ),
    applyAbility: (id: string, input: CombatAbilityInput) =>
      run(
        () => api.applyAbility(id, input),
        'Не удалось применить способность',
      ),
    setWeaponSet: (id: string, set: WeaponSet) =>
      run(() => api.weaponSet(id, set), 'Не удалось сменить набор оружия'),
  };
}

export type SceneCombat = ReturnType<typeof useSceneCombat>;
