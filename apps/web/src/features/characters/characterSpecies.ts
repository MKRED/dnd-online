import type { CharacterSpecies } from 'shared';

// Русские названия — как на next.dnd.su (кроме феи: её там нет, название выбрал пользователь);
// справочник с источниками лежит в docs/species.md.
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
  halfling: 'Полурослик',
  hexblood: 'Ведьмовская кровь',
  human: 'Человек',
  kalashtar: 'Калаштар',
  khoravar: 'Кхоравар',
  lupin: 'Волколак',
  orc: 'Орк',
  reborn: 'Возрождённый',
  shifter: 'Шифтер',
  tiefling: 'Тифлинг',
  warforged: 'Кованый',
};

export const SPECIES_OPTIONS = (
  Object.entries(SPECIES_LABELS) as [CharacterSpecies, string][]
)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
