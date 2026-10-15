import { Tabs } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { CATALOG_SECTIONS, type CatalogSection } from './catalogSections';

interface CatalogNavProps {
  active: CatalogSection;
}

// Полоса разделов над списком. Вкладки Mantine — кнопки, а не ссылки, поэтому раздел
// открывается переходом по адресу; стрелки и Tab работают, как у обычных вкладок.
function CatalogNav({ active }: CatalogNavProps) {
  const navigate = useNavigate();
  return (
    <Tabs
      value={active}
      onChange={(value) => {
        const section = CATALOG_SECTIONS.find((s) => s.value === value);
        if (section && section.value !== active) void navigate(section.path);
      }}
      mb="md"
    >
      <Tabs.List aria-label="Разделы справочника">
        {CATALOG_SECTIONS.map(({ value, label }) => (
          <Tabs.Tab key={value} value={value}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

export default CatalogNav;
