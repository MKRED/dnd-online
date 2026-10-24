import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  emptyVoxelModel,
  type VoxelModelFields,
} from 'shared';
import { toSourcesInput } from '../../catalog';
import { toFurnitureValues, type FurnitureValues } from '../Furniture';
import { blockValidate, toBlockValues, type BlockValues } from '../BlockGroup';
import {
  toDurationValues,
  validateDurationAmount,
  type DurationValues,
} from '../DurationField/durationForm';
import {
  effectValidate,
  toEffectValues,
  type EffectValues,
} from '../EffectFields';
import {
  toMonsterAbilityValues,
  type MonsterAbilityValues,
} from '../monsterAbilityForm';
import { spellValidate, toSpellValues, type SpellValues } from '../SpellFields';
import { stepsValidate, toStepValues, type StepValues } from '../StepsField';
import { toUsageValues, usageValidate, type UsageValues } from '../UsageField';
import { toMeshDraft, type MeshDraft } from '../VoxelModel/mesh/meshDraft';
import type {
  SimpleCatalogDef,
  SimpleEntry,
  SimpleInput,
} from '../simpleCatalogs';
export interface SimpleFormValues {
  name: string;
  // Категория способности; у эффекта категории нет — поле не уходит в запрос.
  category: string;
  description: string;
  sources: string[];
  isPublic: boolean;
  // Общие поля разделов (catalogExtras.tsx). В форме есть поля обоих разделов, а в
  // запрос уходят только поля своего.
  duration: DurationValues;
  effect: EffectValues;
  usage: UsageValues;
  // «Применение» способности.
  steps: StepValues[];
  // Поля категории «Заклинание»; у других категорий не уходят в запрос.
  spell: SpellValues;
  // Поля категории «Монстра» — так же.
  monster: MonsterAbilityValues;
  // Вид и свойства группы блоков.
  block: BlockValues;
  // Модель из вокселей (docs/plan/blocks.md, этап 8а): её правит редактор целиком.
  model: VoxelModelFields;
  // Загруженный файл модели (этап 9); null — файла нет.
  modelMesh: MeshDraft | null;
  // Выбранный файл модели ещё сжимается в браузере (docs/plan/done/monster-models.md, этап 3):
  // форма ждёт, иначе сохранила бы модель без него.
  meshCompressing: boolean;
  // Модель и крепление обстановки (этап 8б).
  furniture: FurnitureValues;
}

// Те же правила и тексты, что у сервера (CatalogEntryDto, EffectDto, AbilityDto).
export const simpleFormValidate = {
  name: (value: string) => {
    const length = value.trim().length;
    return length >= 1 && length <= CATALOG_NAME_MAX_LENGTH
      ? null
      : `Название — от 1 до ${CATALOG_NAME_MAX_LENGTH} символов`;
  },
  description: (value: string) =>
    value.length <= CATALOG_DESCRIPTION_MAX_LENGTH
      ? null
      : `Описание — не длиннее ${CATALOG_DESCRIPTION_MAX_LENGTH} символов`,
  duration: { amount: validateDurationAmount },
  effect: effectValidate,
  usage: usageValidate,
  steps: stepsValidate,
  spell: spellValidate,
  block: blockValidate,
};

export function toSimpleFormValues(
  def: SimpleCatalogDef,
  entry: SimpleEntry | null,
): SimpleFormValues {
  return {
    name: entry?.name ?? '',
    category:
      entry && 'category' in entry
        ? entry.category
        : (def.categories?.[0] ?? ''),
    description: entry?.description ?? '',
    sources: entry?.sources ?? [],
    isPublic: entry?.isPublic ?? false,
    duration: toDurationValues(
      entry && 'duration' in entry ? entry.duration : undefined,
    ),
    effect: toEffectValues(entry && 'components' in entry ? entry : undefined),
    usage: toUsageValues(entry && 'activation' in entry ? entry : undefined),
    steps: entry && 'steps' in entry ? entry.steps.map(toStepValues) : [],
    spell: toSpellValues(
      entry && 'category' in entry && entry.category === 'spell'
        ? entry.details
        : undefined,
    ),
    monster: toMonsterAbilityValues(
      entry && 'category' in entry && entry.category === 'monster'
        ? entry.details
        : undefined,
    ),
    block: toBlockValues(entry && 'look' in entry ? entry : undefined),
    model:
      entry && 'voxels' in entry
        ? {
            size: entry.size,
            palette: entry.palette,
            voxels: entry.voxels,
            cells: entry.cells,
          }
        : emptyVoxelModel(),
    modelMesh: toMeshDraft(entry && 'voxels' in entry ? entry : null),
    meshCompressing: false,
    furniture: toFurnitureValues(entry && 'mount' in entry ? entry : undefined),
  };
}

export function toSimpleInput(
  def: SimpleCatalogDef,
  values: SimpleFormValues,
): SimpleInput {
  const input = {
    name: values.name.trim(),
    description: values.description,
    sources: toSourcesInput(values.sources),
    isPublic: values.isPublic,
  };
  // Свои поля раздела (категорию способности, составляющие эффекта) кладёт def.extras;
  // TypeScript этой связи раздела и его полей не видит.
  return { ...input, ...def.extras.toInput(values) } as SimpleInput;
}
