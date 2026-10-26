import { screen } from '@testing-library/react';
import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import EquipmentDetails from './EquipmentDetails';

const item = (category: string, details: object) =>
  ({ category, details }) as Item;

describe('EquipmentDetails', () => {
  it('оружие: урон с бонусом, свойства как в книге', () => {
    renderWithProviders(
      <EquipmentDetails
        item={item('weapon', {
          base: 'longsword',
          weaponCategory: 'martial',
          attackType: 'melee',
          damage: { count: 1, die: 8, type: 'slashing' },
          properties: ['finesse'],
          thrown: { normal: 20, long: 60 },
          ammunition: null,
          versatile: { count: 1, die: 10 },
          mastery: 'sap',
          magicBonus: 1,
          attunement: false,
        })}
      />,
    );
    expect(
      screen.getByText('Воинское рукопашное (длинный меч)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1к8 + 1 рубящий; двумя руками 1к10 + 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Фехтовальное, Метательное (дист. 20/60), Универсальное (1к10)',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('+1 к атаке и урону')).toBeInTheDocument();
  });

  it('доспех: КД с Ловкостью по виду, Сила и Скрытность', () => {
    renderWithProviders(
      <EquipmentDetails
        item={item('armor', {
          base: null,
          kind: 'medium',
          armorClass: 14,
          strength: null,
          stealthDisadvantage: true,
          magicBonus: 1,
          attunement: false,
        })}
      />,
    );
    expect(
      screen.getByText('15 + модификатор Ловкости (не более 2)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Помеха')).toBeInTheDocument();
  });
});
