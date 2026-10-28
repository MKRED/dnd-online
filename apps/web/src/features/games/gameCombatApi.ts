import type {
  AttackKey,
  AttackTarget,
  CombatAbilityInput,
  CombatAction,
  CombatAttackInput,
  CombatantInput,
  CombatResourcesInput,
  GameCombat,
  GameCombatAttack,
  GameCombatDamage,
  GameCombatRoll,
  RollMode,
  WeaponSet,
} from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Бой с очерёдностью на активной сцене (docs/plan/combat.md, этапы 2–5). Правки отвечают
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
    rollHeroes: () => post(`${base}/initiative/heroes`),
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
    // Атаки героя (этап 5): цели под значком, бросок атаки, урон, набор оружия.
    targets: (combatantId: string, attack: AttackKey) =>
      request<AttackTarget[]>(
        `${base}/combatants/${combatantId}/targets?attack=${attack}`,
      ),
    attack: (combatantId: string, input: CombatAttackInput) =>
      request<GameCombatAttack>(`${base}/combatants/${combatantId}/attack`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    damage: (combatantId: string) =>
      request<GameCombatDamage>(`${base}/combatants/${combatantId}/damage`, {
        method: 'POST',
      }),
    weaponSet: (combatantId: string, set: WeaponSet) =>
      put(`${base}/combatants/${combatantId}/weapon-set`, { set }),
  };
}

export type CombatApi = ReturnType<typeof combatApi>;
