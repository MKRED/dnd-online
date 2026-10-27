import type {
  CombatAbilityInput,
  CombatAction,
  CombatantInput,
  CombatResourcesInput,
  GameCombat,
  GameCombatRoll,
  RollMode,
} from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Бой с очерёдностью на активной сцене (docs/plan/combat.md, этапы 2–4). Правки отвечают
// очередью глазами того, кто правил.

const combatBase = (gameId: string) => `/games/${gameId}/combat`;

// Закрытая игроку сцена — 403, нет активной — 404.
export function getGameCombat(gameId: string): Promise<GameCombat> {
  return request(combatBase(gameId));
}

const post = (url: string, body: unknown = {}) =>
  request<GameCombat>(url, { method: 'POST', body: JSON.stringify(body) });
const put = (url: string, body: unknown) =>
  request<GameCombat>(url, { method: 'PUT', body: JSON.stringify(body) });

// Всё, чем страница сцены правит бой этой игры.
export function combatApi(gameId: string) {
  const base = combatBase(gameId);
  return {
    start: (participants: CombatantInput[]) =>
      post(`${base}/start`, { participants }),
    join: (participants: CombatantInput[]) =>
      post(`${base}/combatants`, { participants }),
    leave: (combatantId: string) =>
      request<GameCombat>(`${base}/combatants/${combatantId}`, {
        method: 'DELETE',
      }),
    // mode — переключатель мастера; без него — по правилам.
    roll: (combatantId: string, mode: RollMode | null) =>
      request<GameCombatRoll>(`${base}/combatants/${combatantId}/initiative`, {
        method: 'POST',
        body: JSON.stringify(mode ? { mode } : {}),
      }),
    rollCreatures: () => post(`${base}/initiative/creatures`),
    setInitiative: (combatantId: string, initiative: number) =>
      put(`${base}/combatants/${combatantId}/initiative`, { initiative }),
    reorder: (ids: string[]) => put(`${base}/order`, { ids }),
    endTurn: (combatantId: string) => post(`${base}/turn/end`, { combatantId }),
    passTurn: (combatantId: string) => put(`${base}/turn`, { combatantId }),
    // «Рывок», «Отход», «Уклонение» — тратят действие (этап 4).
    takeAction: (combatantId: string, action: CombatAction) =>
      post(`${base}/combatants/${combatantId}/actions`, { action }),
    setResources: (combatantId: string, input: CombatResourcesInput) =>
      put(`${base}/combatants/${combatantId}/resources`, input),
    // «Применить» способность: тратит действие её вида и ячейку круга slotLevel.
    applyAbility: (combatantId: string, input: CombatAbilityInput) =>
      post(`${base}/combatants/${combatantId}/abilities`, input),
  };
}

export type CombatApi = ReturnType<typeof combatApi>;
