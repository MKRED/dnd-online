import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { sizeLabel, type MapListItem } from 'shared';
import type { CatalogCollectionView } from '../../features/catalog';
import { MapNameForm } from '../../features/maps';
import MapMenu from './MapMenu';
import MapShape from './MapShape';
import { editedLabel, startsLabel } from './mapLabels';
import classes from './MapsPage.module.css';

interface MapCardProps {
  map: MapListItem;
  view: CatalogCollectionView;
  renaming: boolean;
  deleting: boolean;
  onStartRename: () => void;
  onStopRename: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
}

// Карта в «Моих картах» — строкой списка или плиткой (вид переключается над списком,
// решено с пользователем 2026-11-01). Действия — в меню «⋯», щелчок по карточке открывает
// карту; пока открыто поле имени, карточка не ссылка, чтобы щелчок по полю не уводил.
function MapCard({
  map,
  view,
  renaming,
  deleting,
  onStartRename,
  onStopRename,
  onRename,
  onDelete,
}: MapCardProps) {
  const title = renaming ? (
    <div className={classes.above} style={{ flex: 1, minWidth: 0 }}>
      <MapNameForm
        initial={map.name}
        onSave={onRename}
        onClose={onStopRename}
      />
    </div>
  ) : (
    <Link to={`/maps/${map.id}`} className={classes.link}>
      {map.name}
    </Link>
  );
  const menu = !renaming && (
    <div className={classes.above}>
      <MapMenu
        name={map.name}
        deleting={deleting}
        onRename={onStartRename}
        onDelete={onDelete}
      />
    </div>
  );
  const facts = (
    <Group gap={6} wrap="wrap">
      <Badge variant="light" color="gray" size="sm" tt="none">
        {sizeLabel(map)}
      </Badge>
      <Badge
        variant="light"
        color={map.startCount === 0 ? 'orange' : 'gray'}
        size="sm"
        tt="none"
      >
        {startsLabel(map.startCount)}
      </Badge>
      <Text size="xs" c="dimmed">
        {editedLabel(map.updatedAt)}
      </Text>
    </Group>
  );

  if (view === 'grid') {
    return (
      <Card withBorder radius="md" p={0} className={classes.card}>
        <div className={classes.cover}>
          <MapShape size={map} box={72} />
        </div>
        <Stack gap={6} p="sm">
          <Group gap="xs" wrap="nowrap" justify="space-between" align="center">
            {title}
            {menu}
          </Group>
          {facts}
        </Stack>
      </Card>
    );
  }
  return (
    <Card withBorder radius="md" p="sm" className={classes.card}>
      <Group gap="md" wrap="nowrap">
        <span className={classes.thumb}>
          <MapShape size={map} box={30} />
        </span>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          {title}
          {facts}
        </Stack>
        {menu}
      </Group>
    </Card>
  );
}

export default MapCard;
