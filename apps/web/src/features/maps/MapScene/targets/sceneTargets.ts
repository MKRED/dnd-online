// Цели атаки на сцене (docs/plan/combat.md, «Выбор цели после этапа 5»): подсвечена
// только цель под курсором или выбранная, над ней — строка «можно или нельзя».

// Как красить рамку, подпись и луч: можно, можно с помехой, не достать.
export type TargetTone = 'normal' | 'disadvantage' | 'out';

export const TONE_COLORS: Record<TargetTone, string> = {
  normal: '#51cf66',
  disadvantage: '#ff922b',
  out: '#ff6b6b',
};

export interface SceneTargetMark {
  tone: TargetTone;
  // «✓ Гоблин · 25 фт. · помеха» — одной строкой, подробности в панели.
  label: string;
}

// Ключи — как у целей в панели: «creature:<objectId>» и «figure:<characterId>».
export const creatureKey = (objectId: number) => `creature:${objectId}`;
export const figureKey = (characterId: string) => `figure:${characterId}`;

export interface SceneAttackTargets {
  marks: ReadonlyMap<string, SceneTargetMark>;
  selectedKey: string | null;
  // Щелчок по цели на карте; панель сама решает, можно ли её выбрать.
  pick: (key: string) => void;
  // Кто атакует: от его фигурки идёт луч дальней атаки.
  attackerKey: string;
  ranged: boolean;
}
