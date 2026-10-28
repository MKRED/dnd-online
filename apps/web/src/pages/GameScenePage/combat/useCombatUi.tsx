import { useMemo, useState, type ReactNode } from 'react';
import type { CombatantRef, Vec3 } from 'shared';
import CombatantDialog, { type CombatantEdit } from './CombatantDialog';
import { RollWindow } from './RollWindow';
import { candidateKey, StartCombatModal } from './StartCombat';
import {
  combatEntries,
  combatLook,
  TurnButtons,
  TurnStrip,
  type CombatEntry,
  type EntrySources,
  type StripActions,
} from './TurnStrip';
import { turnBlocks, type TurnBlocks } from './turnBlocks';
import type { SceneCombat } from './useSceneCombat';

interface CombatUiOptions {
  combat: SceneCombat;
  master: boolean;
  sources: EntrySources;
  // Полоса не видна: мастер в «Правке» или смотрит «Глазами игроков».
  hidden: boolean;
  // Окно «Начать бой» или «Позвать в бой»; открывает его и вкладка «Сцена».
  dialog: boolean;
  onDialog: (open: boolean) => void;
  focus: (at: Vec3) => void;
  // «Показать на сцене» заодно выбирает участника, как щелчок в «Участниках» (замечание
  // Михаила 2026-10-28).
  select: (ref: CombatantRef) => void;
  // Номер правок листов и существ: блок хода героя перечитывает его лист.
  version: number;
}

// Бой с очерёдностью на странице сцены (docs/plan/combat.md, этапы 3–4): полоса над сценой с
// кнопками, окна — броска, «Начать бой», правок мастера — и блоки «Ваш ход». Полосу страница
// ставит в плашку над сценой, окна — куда угодно, блоки — в панель.
export function useCombatUi({
  combat,
  master,
  sources,
  hidden,
  dialog,
  onDialog,
  focus,
  select,
  version,
}: CombatUiOptions): {
  strip: ReactNode;
  windows: ReactNode;
  turn: TurnBlocks;
} {
  const state = combat.combat;
  const entries = useMemo(
    () => (state ? combatEntries(state, sources) : []),
    [state, sources],
  );
  // Окно броска держит участника, каким он был при броске: после броска в очереди у него
  // уже число, а окно ещё показывает итог.
  const [chosen, setChosen] = useState<CombatEntry | null>(null);
  const [edit, setEdit] = useState<CombatantEdit | null>(null);
  // Своё окно броска игрок видит само один раз на участника: закрыл — бросит кнопкой.
  const [offered, setOffered] = useState<ReadonlySet<string>>(new Set());
  const own = master
    ? undefined
    : entries.find(
        (e) =>
          e.kind === 'pc' &&
          e.combatant.canRoll &&
          e.combatant.initiative === null &&
          !offered.has(e.id),
      );
  const rolling = chosen ?? own ?? null;
  const offer = (id: string) => setOffered((set) => new Set(set).add(id));

  const rolledIds = entries
    .filter((e) => e.combatant.initiative !== null)
    .map((e) => e.id);
  const actions: StripActions = {
    focus: (entry) => {
      if (entry.at) focus(entry.at);
      select(entry.combatant.ref);
    },
    roll: (entry) => {
      offer(entry.id);
      setChosen(entry);
    },
    pass: (id) => void combat.passTurn(id),
    move: (id, step) => {
      const ids = [...rolledIds];
      const from = ids.indexOf(id);
      const to = from + step;
      if (from === -1 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      void combat.reorder(ids);
    },
    edit: (entry, what) => setEdit({ entry, what }),
  };

  const ordered = state !== null && state.combatants.length > 0;
  const strip =
    ordered && !hidden ? (
      <TurnStrip
        combat={state}
        entries={entries}
        master={master}
        actions={actions}
        onAdd={() => onDialog(true)}
      >
        <TurnButtons
          combat={state}
          entries={entries}
          master={master}
          busy={combat.busy}
          error={combat.error}
          onClearError={combat.clearError}
          onRoll={actions.roll}
          onRollCreatures={() => void combat.rollCreatures()}
          onEndTurn={(id) => void combat.endTurn(id)}
        />
      </TurnStrip>
    ) : null;

  const rows = (state?.candidates ?? []).map((c) => ({
    ...c,
    key: candidateKey(c),
    look: combatLook(c, sources),
  }));
  const windows = (
    <>
      {rolling && (
        <RollWindow
          key={rolling.id}
          opened
          title="Инициатива"
          caption={rolling.kind === 'monster' ? null : 'проверка Ловкости'}
          name={rolling.name}
          pending={rolling.combatant.pending}
          master={master}
          onRoll={(mode) => {
            setChosen(rolling);
            offer(rolling.id);
            return combat.roll(rolling.id, master ? mode : null);
          }}
          onClose={() => {
            offer(rolling.id);
            setChosen(null);
          }}
        />
      )}
      {master && dialog && (
        <StartCombatModal
          opened
          mode={ordered ? 'join' : 'start'}
          rows={rows}
          busy={combat.busy}
          onSubmit={ordered ? combat.join : combat.start}
          onClose={() => onDialog(false)}
        />
      )}
      <CombatantDialog
        key={edit ? `${edit.entry.id}:${edit.what}` : 'none'}
        edit={edit}
        busy={combat.busy}
        onInitiative={combat.setInitiative}
        onRemove={combat.leave}
        onClose={() => setEdit(null)}
      />
    </>
  );
  const turn = turnBlocks({ combat, entries, sources, master, version });
  return { strip, windows, turn };
}
