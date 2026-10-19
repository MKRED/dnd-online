import type { FormErrors } from '@mantine/form';
import {
  ABILITY_SCORES,
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  MONSTER_ABILITY_SCORE_MAX,
  MONSTER_ALIGNMENT_MAX_LENGTH,
  MONSTER_ARMOR_CLASS_MAX,
  MONSTER_BONUS_MAX,
  MONSTER_BONUS_MIN,
  MONSTER_HIT_BONUS_MIN,
  MONSTER_HIT_DICE_COUNT_MAX,
  MONSTER_HIT_POINTS_MAX,
  MONSTER_LAIR_XP_MAX,
  MONSTER_LANGUAGES_MAX_LENGTH,
  MONSTER_LEGENDARY_ACTIONS_MAX,
  MONSTER_PASSIVE_PERCEPTION_MAX,
  MONSTER_SAVE_DC_MAX,
  MONSTER_TAGS_MAX_LENGTH,
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  SPEED_FEET_MAX,
  SPEED_FEET_STEP,
  senseHasRange,
} from 'shared';
import type { MonsterFormValues, NumValue } from './monsterFormValues';

// Проверка формы монстра — те же пределы, что у сервера (isMonsterStatBlock). Сервер на
// любую ошибку стат-блока отвечает одним «Стат-блок монстра задан неверно», поэтому
// форма ловит всё сама и говорит, какое поле не так.

const REQUIRED = 'Обязательное поле';
const signed = (n: number) => (n > 0 ? `+${n}` : String(n).replace('-', '−'));

interface IntRule {
  min: number;
  max: number;
  // Есть — значение кратно шагу (футы на карте кратны 5).
  step?: number;
  // Как писать пределы: «+30» у бонусов.
  bonus?: boolean;
}

function intError(value: NumValue, rule: IntRule, required: boolean) {
  if (value === '') return required ? REQUIRED : null;
  const n = Number(value);
  const { min, max, step, bonus } = rule;
  const range = bonus
    ? `От ${signed(min)} до ${signed(max)}`
    : `От ${min} до ${max}`;
  if (!Number.isInteger(n) || n < min || n > max) return range;
  if (step && n % step !== 0) return `${range}, кратно ${step}`;
  return null;
}

const BONUS: IntRule = {
  min: MONSTER_BONUS_MIN,
  max: MONSTER_BONUS_MAX,
  bonus: true,
};
const SPEED: IntRule = {
  min: SPEED_FEET_STEP,
  max: SPEED_FEET_MAX,
  step: SPEED_FEET_STEP,
};

const tooLong = (value: string, max: number) =>
  value.trim().length > max ? `Не длиннее ${max} символов` : null;

// Повтор в списке: ошибка у второго и следующих, первое вхождение остаётся верным.
function repeats<T>(values: T[]): boolean[] {
  return values.map((value, i) => value !== '' && values.indexOf(value) < i);
}

export function validateMonsterForm(values: MonsterFormValues): FormErrors {
  const errors: FormErrors = {};
  const check = (path: string, error: string | null) => {
    if (error) errors[path] = error;
  };
  const int = (path: string, value: NumValue, rule: IntRule, required = true) =>
    check(path, intError(value, rule, required));

  const name = values.name.trim().length;
  check(
    'name',
    name >= 1 && name <= CATALOG_NAME_MAX_LENGTH
      ? null
      : `Название — от 1 до ${CATALOG_NAME_MAX_LENGTH} символов`,
  );
  check('tags', tooLong(values.tags, MONSTER_TAGS_MAX_LENGTH));
  check('alignment', tooLong(values.alignment, MONSTER_ALIGNMENT_MAX_LENGTH));
  int('lairXp', values.lairXp, { min: 0, max: MONSTER_LAIR_XP_MAX }, false);

  int('armorClass', values.armorClass, {
    min: 1,
    max: MONSTER_ARMOR_CLASS_MAX,
  });
  int('initiative', values.initiative, BONUS);
  const hp = values.hitPoints;
  int('hitPoints.average', hp.average, {
    min: 1,
    max: MONSTER_HIT_POINTS_MAX,
  });
  int('hitPoints.count', hp.count, {
    min: 1,
    max: MONSTER_HIT_DICE_COUNT_MAX,
  });
  int('hitPoints.bonus', hp.bonus, {
    min: MONSTER_HIT_BONUS_MIN,
    max: MONSTER_HIT_POINTS_MAX,
    bonus: true,
  });
  int('speed.walk', values.speed.walk, { ...SPEED, min: 0 });
  for (const kind of ['burrow', 'climb', 'fly', 'swim'] as const) {
    int(`speed.${kind}`, values.speed[kind], SPEED, false);
  }

  for (const ability of ABILITY_SCORES) {
    const { score, save } = values.abilities[ability];
    int(`abilities.${ability}.score`, score, {
      min: 1,
      max: MONSTER_ABILITY_SCORE_MAX,
    });
    int(`abilities.${ability}.save`, save, BONUS);
  }

  const skillRepeats = repeats(values.skills.map((entry) => entry.skill));
  values.skills.forEach(({ skill, bonus }, i) => {
    check(
      `skills.${i}.skill`,
      !skill
        ? 'Выберите навык'
        : skillRepeats[i]
          ? 'Навык уже есть выше'
          : null,
    );
    int(`skills.${i}.bonus`, bonus, BONUS);
  });

  const senseRepeats = repeats(values.senses.map((entry) => entry.sense));
  values.senses.forEach(({ sense, range }, i) => {
    check(
      `senses.${i}.sense`,
      !sense
        ? 'Выберите чувство'
        : senseRepeats[i]
          ? 'Чувство уже есть выше'
          : null,
    );
    if (sense && senseHasRange(sense)) {
      int(`senses.${i}.range`, range, {
        min: SENSE_RANGE_STEP,
        max: SENSE_RANGE_MAX,
        step: SENSE_RANGE_STEP,
      });
    }
  });
  int('passivePerception', values.passivePerception, {
    min: 0,
    max: MONSTER_PASSIVE_PERCEPTION_MAX,
  });
  check('languages', tooLong(values.languages, MONSTER_LANGUAGES_MAX_LENGTH));

  const legendary = { min: 1, max: MONSTER_LEGENDARY_ACTIONS_MAX };
  int('legendaryActions', values.legendaryActions, legendary, false);
  int('legendaryActionsLair', values.legendaryActionsLair, legendary, false);
  if (values.legendaryActionsLair !== '' && values.legendaryActions === '') {
    errors.legendaryActionsLair = 'Сначала укажите легендарные действия';
  }
  const { saveDc, attackBonus } = values.spellcasting;
  int(
    'spellcasting.saveDc',
    saveDc,
    { min: 1, max: MONSTER_SAVE_DC_MAX },
    false,
  );
  int('spellcasting.attackBonus', attackBonus, BONUS, false);

  check(
    'description',
    values.description.length <= CATALOG_DESCRIPTION_MAX_LENGTH
      ? null
      : `Описание — не длиннее ${CATALOG_DESCRIPTION_MAX_LENGTH} символов`,
  );
  return errors;
}
