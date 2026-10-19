import { DEFAULT_MONSTER_STAT_BLOCK, isMonsterStatBlock } from 'shared';
import { describe, expect, it } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { validateMonsterForm } from './monsterFormValidate';
import { toMonsterFormValues, toMonsterInput } from './monsterFormValues';

describe('значения формы монстра', () => {
  // Сервер проверяет стат-блок строго (isMonsterStatBlock): форма не должна терять поля
  // или добавлять свои.
  it('новый монстр — стат-блок по умолчанию, который принимает сервер', () => {
    const values = toMonsterFormValues(null);
    expect(validateMonsterForm({ ...values, name: 'Крыса' })).toEqual({});
    const { statBlock } = toMonsterInput(values, []);
    expect(statBlock).toEqual(DEFAULT_MONSTER_STAT_BLOCK);
    expect(isMonsterStatBlock(statBlock)).toBe(true);
  });

  it('монстр из базы проходит форму без изменений', () => {
    const values = toMonsterFormValues(sampleMonster);
    expect(validateMonsterForm(values)).toEqual({});
    const input = toMonsterInput(values, sampleMonster.sources);
    expect(input.statBlock).toEqual(sampleMonster.statBlock);
    expect(isMonsterStatBlock(input.statBlock)).toBe(true);
    expect(input).toMatchObject({
      name: 'Аболет',
      category: 'aberration',
      role: 'unique',
      isPublic: true,
    });
  });

  it('пустые необязательные поля уходят как null, лишнее не уходит', () => {
    const values = toMonsterFormValues(sampleMonster);
    values.lairXp = '';
    values.legendaryActions = '';
    values.legendaryActionsLair = '';
    values.spellcasting = { ability: null, saveDc: '', attackBonus: '' };
    // «Парит» без полёта и дистанция у «Видения невидимого» остаются от прежнего ввода.
    values.speed.hover = true;
    values.senses.push({ id: 'x', sense: 'see_invisible', range: 30 });
    const { statBlock } = toMonsterInput(values, ['  ', 'MM']);
    expect(statBlock).toMatchObject({
      lairXp: null,
      legendaryActions: null,
      legendaryActionsLair: null,
      spellcasting: { ability: null, saveDc: null, attackBonus: null },
      speed: { fly: null, hover: false },
    });
    expect(statBlock.senses[1]).toEqual({
      sense: 'see_invisible',
      range: null,
    });
    expect(isMonsterStatBlock(statBlock)).toBe(true);
  });
});
