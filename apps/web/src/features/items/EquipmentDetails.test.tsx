import { screen } from '@testing-library/react';
import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import EquipmentDetails from './EquipmentDetails';

const item = (category: string, details: object) =>
  ({ category, details }) as Item;

describe('EquipmentDetails', () => {
  it('оружие: урон с бонусом и доп. уроном, свойства как в книге', () => {
    renderWithProviders(
      <EquipmentDetails
        item={item('weapon', {
          base: 'longsword',
          weaponCategory: 'martial',
          attackType: 'melee',
          damage: { count: 1, die: 8, type: 'slashing' },
          extraDamage: [
            { count: 2, die: 4, type: 'fire' },
            { count: 4, die: null, type: 'necrotic' },
          ],
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
      screen.getByText(
        '1к8 + 1 рубящий + 2к4 огонь + 4 некротический; двумя руками 1к10 + 1',
      ),
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

  it('«Без настройки»: что действует, или только обычные свойства', () => {
    const shield = (over: object) =>
      item('shield', {
        armorClass: 2,
        magicBonus: 1,
        attunement: true,
        ...over,
      });
    const { unmount } = renderWithProviders(
      <EquipmentDetails item={shield({})} />,
    );
    expect(screen.getByText('Только обычные свойства')).toBeInTheDocument();
    unmount();
    renderWithProviders(
      <EquipmentDetails item={shield({ bonusWithoutAttunement: true })} />,
    );
    expect(screen.getByText('Действует бонус +1')).toBeInTheDocument();
  });

  it('без «Требует настройки» строки нет', () => {
    renderWithProviders(
      <EquipmentDetails
        item={item('shield', {
          armorClass: 2,
          magicBonus: 1,
          attunement: false,
        })}
      />,
    );
    expect(screen.queryByText('Без настройки')).toBeNull();
  });
});
