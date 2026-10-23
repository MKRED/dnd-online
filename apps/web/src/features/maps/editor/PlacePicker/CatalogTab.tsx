import { Anchor, Loader, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import classes from '../BlockPicker/BlockPicker.module.css';
import { toCatalogChoice, type CatalogKind } from '../objects/catalogChoice';
import { useMapCatalogSearch } from '../objects/useMapCatalogSearch';
import ObjectTile from './ObjectTile';
import type { ObjectChoice } from './placeChoice';

// Вид выбора по виду записи каталога: монстр и НПС — «существо».
const choiceKind = (kind: CatalogKind) =>
  kind === 'monster' || kind === 'npc' ? 'creature' : kind;

const EMPTY: Record<string, React.ReactNode> = {
  furniture: (
    <>
      Своей обстановки нет — создайте её в{' '}
      <Anchor component={Link} to="/furniture/new" target="_blank" size="sm">
        «Обстановке»
      </Anchor>
      .
    </>
  ),
  item: 'Предметов нет — ни своих, ни опубликованных.',
  creature: 'Ни монстров, ни своих НПС нет.',
};

interface CatalogTabProps {
  kinds: readonly CatalogKind[];
  // Строка поиска; пусто — первые записи по алфавиту.
  q?: string;
  current: ObjectChoice | null;
  onPick: (choice: ObjectChoice) => void;
}

const CATALOG_PAGE = 20;

const sameEntry = (a: ObjectChoice | null, kind: CatalogKind, id: string) =>
  a !== null && 'entry' in a && a.entry.kind === kind && a.entry.id === id;

// Записи каталога для постановки плитками: своя обстановка, предметы, монстры и НПС.
// Ищет сервер, по 20 записей на вид — как в поиске окна.
function CatalogTab({ kinds, q = '', current, onPick }: CatalogTabProps) {
  const { found, last, error } = useMapCatalogSearch(kinds, q);
  if (error)
    return (
      <Text size="sm" c="red">
        {error}
      </Text>
    );
  if (!found && !last.length) return <Loader size="sm" />;
  const list = found ?? last;
  if (!list.length)
    return (
      <Text size="sm" c="dimmed">
        {q ? 'Ничего не нашлось.' : EMPTY[choiceKind(kinds[0])]}
      </Text>
    );
  return (
    <Stack gap="xs">
      <div className={classes.grid}>
        {list.map((entry) => {
          const choice = {
            kind: choiceKind(entry.kind),
            entry: toCatalogChoice(entry),
          } as ObjectChoice;
          return (
            <ObjectTile
              key={`${entry.kind}:${entry.id}`}
              choice={choice}
              selected={sameEntry(current, entry.kind, entry.id)}
              onClick={() => onPick(choice)}
            />
          );
        })}
      </div>
      {/* Сервер отдаёт по 20 записей на вид — остальное находит поиск окна. */}
      {!q && list.length >= CATALOG_PAGE && (
        <Text size="xs" c="dimmed">
          Показаны первые {CATALOG_PAGE} по алфавиту — остальное найдёт поиск
          сверху.
        </Text>
      )}
    </Stack>
  );
}

export default CatalogTab;
