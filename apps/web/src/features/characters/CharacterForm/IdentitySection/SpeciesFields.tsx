import { Autocomplete, Grid, Select } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import type { CharacterSpecies } from 'shared';
import type { CharacterFormValues } from '../../characterFormValues';
import { SPECIES_OPTIONS } from '../../characterSpecies';
import { SPECIES_LINEAGES } from '../../characterSpeciesLineages';

interface SpeciesFieldsProps {
  form: UseFormReturnType<CharacterFormValues>;
}

// Вид и его род/наследие: две колонки общей сетки секции. Устроено как ClassRow —
// по той же причине (uncontrolled-форма и мемоизированная секция).
function SpeciesFields({ form }: SpeciesFieldsProps) {
  // Подпись и подсказки второго поля зависят от вида, а форма строку сама не
  // перерисовывает — поэтому выбранный вид дублируется в локальном состоянии.
  const [species, setSpecies] = useState<CharacterSpecies | ''>(
    () => form.getValues().species,
  );
  // Uncontrolled-поле перечитывает значение формы только при монтировании, а form.key
  // в мемоизированной секции устаревший — поле перемонтируется своим счётчиком.
  const [lineageRevision, setLineageRevision] = useState(0);

  const lineage = species ? SPECIES_LINEAGES[species] : undefined;
  let lineagePlaceholder = 'Выберите или впишите свой';
  if (!species) lineagePlaceholder = 'Сначала выберите расу';
  else if (!lineage) lineagePlaceholder = 'У этой расы выбора нет';

  return (
    <>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <Select
          label="Раса"
          placeholder="Выберите расу"
          data={SPECIES_OPTIONS}
          searchable
          allowDeselect={false}
          nothingFoundMessage="Такой расы нет"
          required
          {...form.getInputProps('species')}
          onChange={(value) => {
            const next = (value ?? '') as CharacterSpecies | '';
            form.setFieldValue('species', next);
            setSpecies(next);
            // Род прежнего вида новому не подходит.
            form.setFieldValue('speciesLineage', '');
            setLineageRevision((revision) => revision + 1);
          }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <Autocomplete
          key={lineageRevision}
          label={lineage?.label ?? 'Род или наследие'}
          placeholder={lineagePlaceholder}
          data={lineage?.options ?? []}
          disabled={!lineage}
          maxLength={50}
          {...form.getInputProps('speciesLineage')}
        />
      </Grid.Col>
    </>
  );
}

export default SpeciesFields;
