import type { CatalogImage } from './catalogImage.js';
import type { EffectFields } from './effects.js';

// Эффекты на персонаже (docs/plan/done/character-effects.md): строка — ссылка на эффект
// каталога, а не копия. Правка карточки автором сразу видна у всех, на ком эффект.

// Карточка эффекта на плашке. Составляющие и длительность нужны листу, чтобы считать итог.
export type CharacterEffectCard = EffectFields & {
  id: string;
  name: string;
  isPublic: boolean;
  image: CatalogImage | null;
};

// Почему у строки нет карточки — как у инвентаря: эффект скрыт от смотрящего или удалён.
export type CharacterEffectMissing = 'hidden' | 'deleted';

export type CharacterEffectEntry = { id: string } & (
  | {
      effect: CharacterEffectCard;
      missing: null;
      // Эффект скрыт от владельца персонажа, но виден смотрящему — его автору на чужом
      // листе: карточка есть, но на персонажа эффект не действует (как предмет в
      // инвентаре).
      inactive: boolean;
    }
  | { effect: null; missing: CharacterEffectMissing }
);

// Наложить эффект каталога. Один эффект на персонаже — один раз: одно и то же
// заклинание по книге не складывается.
export interface CharacterEffectAddInput {
  effectId: string;
}
