// Тексты отказов для эффектов в шагах способности (docs/plan/done/abilities.md, этап 8).
// Чужой скрытый эффект неотличим от несуществующего — так id чужих скрытых эффектов
// нельзя подобрать перебором.
export const STEP_EFFECT_NOT_FOUND = 'Эффект из применения не найден';

// Как способность публикуется: isPublic — сама способность; publishEffects —
// пользователь согласился опубликовать вместе с ней свои скрытые эффекты из шагов.
export interface StepEffectsPublication {
  isPublic: boolean;
  publishEffects: boolean;
}

// 409 при публикации способности со скрытыми эффектами: называем их, чтобы было понятно,
// что публиковать. Форма ловит это сама и предлагает опубликовать их вместе.
export function hiddenEffectsError(
  hidden: readonly { name: string }[],
): string {
  return `Сначала опубликуйте эффекты: ${hidden
    .map((effect) => effect.name)
    .join(', ')}`;
}
