import type { DurationUnit, EffectDuration } from './effectDuration.js';

// Формы слова для 1, 2 и 5: «1 минута», «2 минуты», «5 минут».
type Forms = readonly [string, string, string];

function pluralForm(count: number, forms: Forms): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const UNIT_FORMS: Record<DurationUnit, Forms> = {
  round: ['раунд', 'раунда', 'раундов'],
  minute: ['минута', 'минуты', 'минут'],
  hour: ['час', 'часа', 'часов'],
  day: ['день', 'дня', 'дней'],
};

// После «до»: «до 1 минуты», «до 2 минут», «до 21 часа».
const UNIT_GENITIVE_FORMS: Record<DurationUnit, Forms> = {
  round: ['раунда', 'раундов', 'раундов'],
  minute: ['минуты', 'минут', 'минут'],
  hour: ['часа', 'часов', 'часов'],
  day: ['дня', 'дней', 'дней'],
};

// Единица в согласии с числом — для подписей в списке выбора рядом с числом.
export function durationUnitLabel(unit: DurationUnit, amount: number): string {
  return pluralForm(amount, UNIT_FORMS[unit]);
}

// Полная запись — для карточки эффекта.
export function formatEffectDuration(duration: EffectDuration): string {
  switch (duration.kind) {
    case 'permanent':
      return 'Бессрочно';
    case 'time': {
      const { amount, unit } = duration;
      return duration.concentration
        ? `Концентрация, вплоть до ${amount} ${pluralForm(amount, UNIT_GENITIVE_FORMS[unit])}`
        : `${amount} ${pluralForm(amount, UNIT_FORMS[unit])}`;
    }
    case 'turn': {
      const edge = duration.edge === 'start' ? 'начала' : 'конца';
      return duration.owner === 'creator'
        ? `До ${edge} следующего хода наложившего`
        : `До ${edge} своего следующего хода`;
    }
    case 'rest':
      return duration.rest === 'short'
        ? 'До короткого или длинного отдыха'
        : 'До длинного отдыха';
  }
}

// Короткая запись — для колонки списка, где места мало.
export function formatEffectDurationShort(duration: EffectDuration): string {
  switch (duration.kind) {
    case 'time': {
      const { amount, unit } = duration;
      const time = `${amount} ${pluralForm(amount, UNIT_FORMS[unit])}`;
      return duration.concentration ? `${time}, конц.` : time;
    }
    case 'turn':
      return duration.edge === 'start' ? 'До начала хода' : 'До конца хода';
    case 'rest':
      return duration.rest === 'short' ? 'До отдыха' : 'До длинного отдыха';
    default:
      return formatEffectDuration(duration);
  }
}
