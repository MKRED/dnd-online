// Поля категории «Монстра» в форме (docs/plan/done/monsters-npcs.md, этап 2). Перезарядка —
// строка, как отдаёт Select; 'none' — без перезарядки.
export interface MonsterAbilityValues {
  recharge: string;
}

export const toMonsterAbilityValues = (details?: {
  recharge: number | null;
}): MonsterAbilityValues => ({
  recharge: details?.recharge == null ? 'none' : String(details.recharge),
});

export const fromMonsterAbilityValues = (values: MonsterAbilityValues) => ({
  recharge: values.recharge === 'none' ? null : Number(values.recharge),
});
