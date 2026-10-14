import type { CharacterSpecies } from 'shared';

// Русские названия — как на next.dnd.su; фею и полутабакси там не найти, их назвал пользователь,
// табакси — как на dnd.su (книги 2014).
// справочник с источниками лежит в docs/dnd/species.md.
export const SPECIES_LABELS: Record<CharacterSpecies, string> = {
  aasimar: 'Аасимар',
  changeling: 'Ченжлинг',
  dhampir: 'Дампир',
  dragonborn: 'Драконорождённый',
  dwarf: 'Дварф',
  elf: 'Эльф',
  faerie: 'Фея',
  gnome: 'Гном',
  goliath: 'Голиаф',
  half_tabaxi: 'Полутабакси',
  halfling: 'Полурослик',
  hexblood: 'Ведьмовская кровь',
  human: 'Человек',
  kalashtar: 'Калаштар',
  khoravar: 'Кхоравар',
  lupin: 'Волколак',
  orc: 'Орк',
  reborn: 'Возрождённый',
  shifter: 'Шифтер',
  tabaxi: 'Табакси',
  tiefling: 'Тифлинг',
  warforged: 'Кованый',
};

export const SPECIES_OPTIONS = (
  Object.entries(SPECIES_LABELS) as [CharacterSpecies, string][]
)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
