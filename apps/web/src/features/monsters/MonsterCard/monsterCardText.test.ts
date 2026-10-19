import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import { describe, expect, it } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { formatMonsterKind } from '../monsterKind';
import {
  formatHitDice,
  formatInitiative,
  formatSkills,
  formatSpecialSpeeds,
  monsterTraitRows,
} from './monsterCardText';

describe('тексты карточки монстра', () => {
  it('размер согласуется с родом типа', () => {
    const block = sampleMonster.statBlock;
    expect(formatMonsterKind('aberration', block)).toBe(
      'Большая аберрация, законно-злой',
    );
    expect(
      formatMonsterKind('fiend', {
        size: 'medium',
        tags: 'демон',
        alignment: '',
      }),
    ).toBe('Среднее исчадие (демон)');
    expect(
      formatMonsterKind('dragon', { size: 'huge', tags: '', alignment: '' }),
    ).toBe('Огромный дракон');
  });

  it('инициатива, хиты и скорости — как в книге', () => {
    expect(formatInitiative(7)).toBe('+7 (17)');
    expect(formatInitiative(-1)).toBe('−1 (9)');
    expect(formatHitDice(sampleMonster.statBlock.hitPoints)).toBe('20к10 + 40');
    expect(
      formatHitDice({ average: 1, dice: { count: 1, die: 4, bonus: -1 } }),
    ).toBe('1к4 − 1');
    expect(formatHitDice(DEFAULT_MONSTER_STAT_BLOCK.hitPoints)).toBe('1к8');
    expect(
      formatSpecialSpeeds({
        ...DEFAULT_MONSTER_STAT_BLOCK.speed,
        fly: 60,
        hover: true,
        swim: 40,
      }),
    ).toBe('полёт 60 фт (парит), плавание 40 фт');
    expect(
      formatSpecialSpeeds(DEFAULT_MONSTER_STAT_BLOCK.speed),
    ).toBeUndefined();
  });

  it('строки защиты и чувств; пустые не показываются', () => {
    expect(formatSkills(sampleMonster.statBlock)).toBe(
      'История +12, Восприятие +10',
    );
    expect(monsterTraitRows(sampleMonster.statBlock)).toEqual([
      ['Чувства', 'Тёмное зрение, 120 фт.; пассивное Восприятие 20'],
      ['Языки', 'Глубинная речь, телепатия 120 фт.'],
      ['Легендарные действия', '3 за раунд, 4 в логове'],
      ['Колдовство', 'Интеллект, СЛ 16'],
    ]);
    expect(
      monsterTraitRows({
        ...DEFAULT_MONSTER_STAT_BLOCK,
        immunities: ['poison', 'fire'],
        conditionImmunities: ['poisoned'],
      }),
    ).toEqual([
      ['Иммунитеты', 'яд, огонь'],
      ['Иммунитеты к состояниям', 'отравленный'],
      ['Чувства', 'пассивное Восприятие 10'],
      ['Языки', '—'],
    ]);
  });
});
