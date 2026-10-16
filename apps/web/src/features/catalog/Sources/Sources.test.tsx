import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { CATALOG_SOURCES_MAX } from 'shared';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import SourcesField from './SourcesField';
import SourcesList from './SourcesList';

function Field({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial);
  return <SourcesField value={value} onChange={setValue} />;
}

describe('SourcesList', () => {
  it('ссылка — в новой вкладке без доступа к нашей, остальное — текстом', () => {
    renderWithProviders(
      <SourcesList
        sources={[
          'https://next.dnd.su/spells/',
          'javascript:alert(1)',
          'Книга игрока 2024',
        ]}
      />,
    );
    const link = screen.getByRole('link', { name: /next\.dnd\.su\/spells/ });
    expect(link).toHaveAttribute('href', 'https://next.dnd.su/spells/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    expect(screen.getByText('Книга игрока 2024')).toBeInTheDocument();
  });

  it('без источников блока нет', () => {
    renderWithProviders(<SourcesList sources={[]} />);
    expect(screen.queryByText('Источники')).not.toBeInTheDocument();
  });
});

describe('SourcesField', () => {
  it('добавляет поле с фокусом и убирает', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Field initial={['Книга']} />);
    await user.click(screen.getByRole('button', { name: '+ Источник' }));
    const second = screen.getByLabelText('Источник 2');
    expect(second).toHaveFocus();
    await user.type(second, 'https://dnd.su');
    await user.click(screen.getAllByLabelText('Убрать источник')[0]);
    expect(screen.getByLabelText('Источник 1')).toHaveValue('https://dnd.su');
    expect(screen.queryByLabelText('Источник 2')).not.toBeInTheDocument();
  });

  it('на пределе кнопка выключена', () => {
    renderWithProviders(
      <Field initial={Array(CATALOG_SOURCES_MAX).fill('Книга')} />,
    );
    expect(screen.getByRole('button', { name: '+ Источник' })).toBeDisabled();
  });
});
