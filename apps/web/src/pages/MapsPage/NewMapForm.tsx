import {
  Alert,
  Button,
  Group,
  NumberInput,
  Text,
  TextInput,
} from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_MAP_LIMITS, DEFAULT_MAP_SIZE } from 'shared';
import { createMap, mapSizeLabel } from '../../features/maps';
import { errorMessage } from '../../lib/apiRequest';

const validSide = (value: number | string) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= DEFAULT_MAP_LIMITS.maxSize;

// Новая карта над списком: название и размер; созданная сразу открывается в редакторе.
function NewMapForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  // Пока поле пустое или набирается, там строка — карту с ней не создаём.
  const [width, setWidth] = useState<number | string>(DEFAULT_MAP_SIZE.width);
  const [depth, setDepth] = useState<number | string>(DEFAULT_MAP_SIZE.depth);
  const sizeValid = validSide(width) && validSide(depth);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !sizeValid) return;
    setCreating(true);
    setError(null);
    createMap(name.trim(), { width: Number(width), depth: Number(depth) })
      .then((map) => void navigate(`/maps/${map.id}`))
      .catch((err: unknown) => {
        console.error('Failed to create map', err);
        setError(errorMessage(err, 'Не удалось создать карту'));
      })
      .finally(() => setCreating(false));
  };

  return (
    <form onSubmit={handleCreate}>
      <Group align="flex-end" mb={4}>
        <TextInput
          label="Новая карта"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          style={{ flex: '1 1 12rem' }}
        />
        <NumberInput
          label="Ширина"
          value={width}
          onChange={setWidth}
          min={1}
          max={DEFAULT_MAP_LIMITS.maxSize}
          allowDecimal={false}
          w="6rem"
        />
        <NumberInput
          label="Глубина"
          value={depth}
          onChange={setDepth}
          min={1}
          max={DEFAULT_MAP_LIMITS.maxSize}
          allowDecimal={false}
          w="6rem"
        />
        <Button
          type="submit"
          loading={creating}
          disabled={!name.trim() || !sizeValid}
        >
          Создать
        </Button>
      </Group>
      <Text size="xs" c="dimmed" mb="lg">
        {sizeValid
          ? `Карта ${mapSizeLabel({ width: Number(width), depth: Number(depth) })}; клетка — 5 футов. Размер можно поменять потом.`
          : `Ширина и глубина — от 1 до ${DEFAULT_MAP_LIMITS.maxSize} клеток.`}
      </Text>
      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}
    </form>
  );
}

export default NewMapForm;
