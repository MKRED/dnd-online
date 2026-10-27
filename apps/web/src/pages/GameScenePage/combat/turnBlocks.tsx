import type { ReactNode } from 'react';
import { allowanceLabel } from '../allowanceLabel';
import { TurnPanel, type TurnKitSource } from './TurnPanel';
import type { CombatEntry, EntrySources } from './TurnStrip';
import type { SceneCombat } from './useSceneCombat';

export interface TurnBlocks {
  // Блок своего героя во вкладке «Персонаж»; null — он не в бою или очередь ещё не готова.
  forCharacter: (characterId: string) => ReactNode;
  // Мастеру — блок монстра или НПС, чей сейчас ход (решение Михаила 2026-10-27, вопрос 1,
  // вариант А): встаёт сверху «Участников» и уходит, когда ход переходит к герою.
  master: ReactNode;
}

interface TurnBlocksInput {
  combat: SceneCombat;
  entries: readonly CombatEntry[];
  sources: EntrySources;
  master: boolean;
  version: number;
}

// Блоки «Ваш ход» (docs/plan/combat.md, этап 4): только в бою с очерёдностью и после
// инициативы. Не свой ход — сверху написано, кто ходит, а значки, кроме реакций, бледные.
export function turnBlocks({
  combat,
  entries,
  sources,
  master,
  version,
}: TurnBlocksInput): TurnBlocks {
  const state = combat.combat;
  const started = state !== null && (state.turn !== null || !!state.hiddenTurn);
  const current = entries.find((e) => e.id === state?.turn);
  const waiting = state?.hiddenTurn
    ? 'Ход противника'
    : current
      ? `Ходит ${current.name}`
      : null;

  const block = (entry: CombatEntry | undefined) => {
    const { resources } = entry?.combatant ?? {};
    if (!started || !entry || !resources) return null;
    const look = turnLook(entry, sources);
    if (!look) return null;
    const ownTurn = entry.id === state?.turn;
    return (
      <TurnPanel
        key={entry.id}
        gameId={sources.gameId}
        combatant={{ ...entry.combatant, resources }}
        ownTurn={ownTurn}
        waiting={ownTurn ? null : waiting}
        source={look.source}
        version={version}
        movement={look.movement}
        master={master}
        combat={combat}
      />
    );
  };

  return {
    forCharacter: (characterId) =>
      block(
        entries.find(
          (e) =>
            e.combatant.ref.kind === 'figure' &&
            e.combatant.ref.characterId === characterId,
        ),
      ),
    master: master && current?.kind !== 'pc' ? block(current) : null,
  };
}

// Чей набор показывать и сколько осталось пройти: у героя — его фигурка, у существа — объект
// сцены и его состояние.
function turnLook(
  entry: CombatEntry,
  sources: EntrySources,
): { source: TurnKitSource; movement: string | null } | null {
  const { ref } = entry.combatant;
  if (ref.kind === 'figure') {
    const figure = sources.figures.find(
      (f) => f.character.id === ref.characterId,
    );
    return {
      source: { kind: 'figure', characterId: ref.characterId },
      movement: figure ? allowanceLabel(figure) : null,
    };
  }
  const object = sources.objectOf(ref.objectId);
  const state = sources.creatures.find(
    (c) => c.objectId === ref.objectId,
  )?.state;
  const movement = state ? allowanceLabel(state.movement) : null;
  if (object?.kind === 'monster') {
    return {
      source: { kind: 'monster', sourceId: object.monsterId },
      movement,
    };
  }
  if (object?.kind === 'npc') {
    return {
      source: {
        kind: 'npc',
        sourceId: object.characterId,
        spells: state?.spells ?? null,
      },
      movement,
    };
  }
  return null;
}
