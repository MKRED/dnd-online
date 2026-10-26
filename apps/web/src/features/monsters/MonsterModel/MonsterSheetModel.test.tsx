import { screen } from '@testing-library/react';
import type { Monster } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { renderWithProviders } from '../../../test/render';
import MonsterSheetModel from './MonsterSheetModel';

// three в jsdom не рисуется: превью показывает, откуда возьмёт байты файла.
vi.mock('./MonsterModelPreview', () => ({
  default: ({
    model,
    path,
  }: {
    model: { id: string; scale: number };
    path: (modelId: string, version: number) => string;
  }) => (
    <div>
      Превью ×{model.scale} {path(model.id, 3)}
    </div>
  ),
}));

const MODEL_ID = '22222222-2222-4222-8222-222222222222';
const withModel = (available: boolean): Monster => ({
  ...sampleMonster,
  model: { id: MODEL_ID, scale: 1.5 },
  modelView: {
    id: MODEL_ID,
    name: 'Огр с дубиной',
    available,
    size: [1, 1, 1],
    palette: [],
    voxels: 'AIAg',
    cells: {},
  },
});

describe('MonsterSheetModel', () => {
  it('показывает модель маршрутом монстра и ссылку на неё в «Моделях»', async () => {
    renderWithProviders(<MonsterSheetModel monster={withModel(true)} />);
    expect(
      await screen.findByText(
        `Превью ×1.5 /monsters/${sampleMonster.id}/models/${MODEL_ID}/file?v=3`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '«Огр с дубиной»' }),
    ).toHaveAttribute('href', `/models/${MODEL_ID}`);
  });

  // Скрытую модель чужого автора смотрящий видит на монстре, но открыть не может.
  it('без доступа к модели — без ссылки', async () => {
    renderWithProviders(<MonsterSheetModel monster={withModel(false)} />);
    expect(await screen.findByText(/Превью ×1.5/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('без модели — ничего', () => {
    renderWithProviders(<MonsterSheetModel monster={sampleMonster} />);
    expect(screen.queryByText(/Превью/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3D-модель/)).not.toBeInTheDocument();
  });
});
