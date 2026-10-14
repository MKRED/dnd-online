import { ARMOR_TRAINING, type ArmorTraining } from 'shared';

// Русские названия категорий владения доспехами (docs/dnd/proficiencies.md). В данных
// персонажа хранится ключ, а не название.
export const ARMOR_TRAINING_LABELS: Record<ArmorTraining, string> = {
  light: 'Лёгкие',
  medium: 'Средние',
  heavy: 'Тяжёлые',
  shield: 'Щиты',
};

// Порядок как в книге (от лёгких к тяжёлым, щиты последними), а не по алфавиту.
export const ARMOR_TRAINING_OPTIONS = ARMOR_TRAINING.map((value) => ({
  value,
  label: ARMOR_TRAINING_LABELS[value],
}));
