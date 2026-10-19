import {
  MONSTER_TYPE_LABELS,
  type MonsterSize,
  type MonsterStatBlock,
  type MonsterType,
} from 'shared';

// Строка под названием монстра: «Большая аберрация (маг), законно-злой». Размер
// согласуется с родом типа (docs/dnd/monsters.md, «In the app»); мировоззрение мастер
// пишет сам, как в книге, — его не трогаем.

type Gender = 'm' | 'f' | 'n';

const TYPE_GENDER: Record<MonsterType, Gender> = {
  aberration: 'f',
  beast: 'm',
  celestial: 'm',
  construct: 'm',
  dragon: 'm',
  elemental: 'm',
  fey: 'f',
  fiend: 'n',
  giant: 'm',
  humanoid: 'm',
  monstrosity: 'n',
  ooze: 'f',
  plant: 'n',
  undead: 'f',
};

const SIZE_FORMS: Record<MonsterSize, Record<Gender, string>> = {
  tiny: { m: 'Крошечный', f: 'Крошечная', n: 'Крошечное' },
  small: { m: 'Маленький', f: 'Маленькая', n: 'Маленькое' },
  medium: { m: 'Средний', f: 'Средняя', n: 'Среднее' },
  large: { m: 'Большой', f: 'Большая', n: 'Большое' },
  huge: { m: 'Огромный', f: 'Огромная', n: 'Огромное' },
  gargantuan: { m: 'Громадный', f: 'Громадная', n: 'Громадное' },
};

export function formatMonsterKind(
  type: MonsterType,
  statBlock: Pick<MonsterStatBlock, 'size' | 'tags' | 'alignment'>,
): string {
  const size = SIZE_FORMS[statBlock.size][TYPE_GENDER[type]];
  const tags = statBlock.tags ? ` (${statBlock.tags})` : '';
  const kind = `${size} ${MONSTER_TYPE_LABELS[type].toLowerCase()}${tags}`;
  return statBlock.alignment ? `${kind}, ${statBlock.alignment}` : kind;
}
