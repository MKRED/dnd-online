import type { Effect } from 'shared';
import { describe, expect, it } from 'vitest';
import { ABILITIES, EFFECTS } from '../simpleCatalogs';
import { toSimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { newStep } from '../StepsField/stepsForm';
import { effectDeleteConfirmText } from '../deleteConfirmText';
import {
  abilitySaveConfirmation,
  effectSaveConfirmation,
} from './saveConfirmation';

const ref = (name: string, isPublic: boolean) => ({
  name,
  isPublic,
  image: null,
});

describe('вопрос перед сохранением способности', () => {
  const values = toSimpleFormValues(ABILITIES, null);
  const step = {
    ...newStep(),
    hitEffects: [
      { effectId: 'a', effect: ref('Отравлен', false) },
      { effectId: 'b', effect: ref('Опубликованный', true) },
    ],
    missEffects: [{ effectId: 'c', effect: ref('Замедлен', false) }],
  };

  it('публикация со своими скрытыми эффектами — предложить опубликовать их', () => {
    const question = abilitySaveConfirmation({
      ...values,
      isPublic: true,
      steps: [step],
    });
    expect(question?.lines[0]).toContain('«Отравлен», «Замедлен»');
    expect(question?.actions[0].flags).toEqual({ publishEffects: true });
  });

  it('скрытая способность или без проверки при промахе — не спрашивает', () => {
    expect(abilitySaveConfirmation({ ...values, steps: [step] })).toBeNull();
    const none = {
      ...step,
      check: 'none' as const,
      hitEffects: [step.hitEffects[1]],
    };
    expect(
      abilitySaveConfirmation({ ...values, isPublic: true, steps: [none] }),
    ).toBeNull();
  });
});

describe('скрытие и удаление эффекта', () => {
  const effect = {
    id: 'e',
    name: 'Отравлен',
    isPublic: true,
    abilities: {
      mine: [
        { id: '1', name: 'Луч болезни', isPublic: true },
        { id: '2', name: 'Черновик', isPublic: false },
      ],
      othersCount: 2,
    },
  } as unknown as Effect;
  const values = { ...toSimpleFormValues(EFFECTS, null), isPublic: false };

  it('скрытие опубликованного — свои опубликованные способности скрыть вместе', () => {
    const question = effectSaveConfirmation(values, effect);
    expect(question?.lines.join(' ')).toContain('«Луч болезни»');
    expect(question?.lines.join(' ')).not.toContain('Черновик');
    expect(question?.actions.map((a) => a.flags)).toEqual([
      { hideAbilities: true },
      {},
    ]);
    expect(effectSaveConfirmation({ ...values, isPublic: true }, effect)).toBe(
      null,
    );
  });

  it('подтверждение удаления называет свои способности, чужие — числом', () => {
    expect(effectDeleteConfirmText(effect)).toBe(
      'Удалить эффект «Отравлен» безвозвратно?\n\n' +
        'Он стоит в ваших способностях: «Луч болезни», «Черновик» — и ещё в 2 чужих способностях. Из них он тоже пропадёт.',
    );
    expect(effectDeleteConfirmText({ ...effect, abilities: undefined })).toBe(
      'Удалить эффект «Отравлен» безвозвратно?',
    );
  });
});
