import type { DurationUnit, EffectDuration } from './effectDuration.js';
import { pluralRu } from './pluralRu.js';

type Forms = readonly [string, string, string];

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
  return pluralRu(amount, UNIT_FORMS[unit]);
}

// Полная запись — для карточки эффекта.
export function formatEffectDuration(duration: EffectDuration): string {
  switch (duration.kind) {
    case 'permanent':
      return 'Бессрочно';
    case 'time': {
      const { amount, unit } = duration;
      return duration.concentration
        ? `Концентрация, вплоть до ${amount} ${pluralRu(amount, UNIT_GENITIVE_FORMS[unit])}`
        : `${amount} ${pluralRu(amount, UNIT_FORMS[unit])}`;
    }
    case 'turn': {
      const edge = duration.edge === 'start' ? 'начала' : 'конца';
      return duration.owner === 'creator'
        ? `До ${edge} следующего хода наложившего`
        : `До ${edge} своего следующего хода`;
    }
    case 'rest':
      return duration.rest === 'short'
        ? 'До короткого или долгого отдыха'
        : 'До долгого отдыха';
  }
}

// Короткая запись — для колонки списка, где места мало.
export function formatEffectDurationShort(duration: EffectDuration): string {
  switch (duration.kind) {
    case 'time': {
      const { amount, unit } = duration;
      const time = `${amount} ${pluralRu(amount, UNIT_FORMS[unit])}`;
      return duration.concentration ? `${time}, конц.` : time;
    }
    case 'turn':
      return duration.edge === 'start' ? 'До начала хода' : 'До конца хода';
    case 'rest':
      return duration.rest === 'short' ? 'До отдыха' : 'До долгого отдыха';
    default:
      return formatEffectDuration(duration);
  }
}
