import { Fieldset, Stack } from '@mantine/core';
import type { Character } from 'shared';
import { ARMOR_TRAINING_LABELS } from '../characterArmorTraining';
import { WEAPON_PROFICIENCY_LABELS } from '../characterWeapons';
import SheetField from './SheetField';

// Владения в порядке формы. Пустые строки не показываем, пустой раздел — целиком.
function ProficienciesView({ character }: { character: Character }) {
  const { armor, weapons, tools, languages, other } = character.proficiencies;
  const rows = [
    ['Доспехи', armor.map((value) => ARMOR_TRAINING_LABELS[value]).join(', ')],
    [
      'Оружие',
      weapons.map((value) => WEAPON_PROFICIENCY_LABELS[value]).join(', '),
    ],
    ['Мастерство оружия', character.weaponMasteries.join(', ')],
    ['Инструменты', tools.join(', ')],
    ['Языки', languages.join(', ')],
    ['Прочие владения', other ?? ''],
  ].filter(([, value]) => value);
  if (rows.length === 0) return null;

  return (
    <Fieldset legend="Владения">
      <Stack gap={6}>
        {rows.map(([label, value]) => (
          <SheetField key={label} label={label}>
            {value}
          </SheetField>
        ))}
      </Stack>
    </Fieldset>
  );
}

export default ProficienciesView;
