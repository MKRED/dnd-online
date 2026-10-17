import type {
  SpellDetails,
  SpellDuration,
  SpellDurationKind,
  SpellSchool,
} from './abilitySpell.js';
import { formatEffectDuration } from './effectDurationLabels.js';

// Русские названия школ — по next.dnd.su (docs/dnd/spells.md).
export const SPELL_SCHOOL_LABELS: Record<SpellSchool, string> = {
  abjuration: 'Ограждение',
  conjuration: 'Призыв',
  divination: 'Прорицание',
  enchantment: 'Очарование',
  evocation: 'Воплощение',
  illusion: 'Иллюзия',
  necromancy: 'Некромантия',
  transmutation: 'Преобразование',
};

export const SPELL_DURATION_LABELS: Record<SpellDurationKind, string> = {
  instant: 'Мгновенная',
  time: 'Время',
  dispelled: 'Пока не рассеется',
  special: 'Особая',
};

// «Заговор», «3 круг» — «круг», а не «уровень», как в затрате «Ячейка заклинаний».
export const formatSpellLevel = (level: number): string =>
  level === 0 ? 'Заговор' : `${level} круг`;

// Заголовок карточки, как строка книги: «3 круг, воплощение», «Заговор, призыв».
export const formatSpellHeader = ({ level, school }: SpellDetails): string =>
  `${formatSpellLevel(level)}, ${SPELL_SCHOOL_LABELS[school].toLowerCase()}`;

// «Время» читается как у эффекта: «1 час», «Концентрация, вплоть до 1 минуты».
export function formatSpellDuration(duration: SpellDuration): string {
  return duration.kind === 'time'
    ? formatEffectDuration(duration)
    : SPELL_DURATION_LABELS[duration.kind];
}
