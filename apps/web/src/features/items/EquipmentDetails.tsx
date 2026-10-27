import {
  ARMOR_DEX_CAP,
  type ArmorKind,
  type Item,
  type MagicBonus as MagicBonusFields,
  type WeaponExtraDamage,
} from 'shared';
import { DetailsField } from '../catalog';
import {
  WEAPON_GROUP_LABELS,
  WEAPON_LABELS,
} from '../characters/characterWeapons';
import {
  AMMUNITION_LABELS,
  ARMOR_KIND_LABELS,
  BOOK_ARMOR_LABELS,
  WEAPON_FLAG_LABELS,
  WEAPON_MASTERY_LABELS,
  WEAR_SLOT_LABELS,
  formatDamage,
  formatRange,
  formatVersatile,
} from './equipmentLabels';

type Weapon = Extract<Item, { category: 'weapon' }>['details'];

// Свойства одной строкой, как в таблице книги: «Метательное (дист. 20/60), Универсальное (1к10)».
function weaponProperties(details: Weapon): string {
  const parts = details.properties.map((flag) => WEAPON_FLAG_LABELS[flag]);
  if (details.thrown)
    parts.push(`Метательное (${formatRange(details.thrown)})`);
  if (details.ammunition)
    parts.push(
      `Боеприпас (${formatRange(details.ammunition)}; ${AMMUNITION_LABELS[details.ammunition.kind]})`,
    );
  if (details.versatile)
    parts.push(`Универсальное (${formatVersatile(details.versatile)})`);
  return parts.length > 0 ? parts.join(', ') : '—';
}

// Что действует без настройки (docs/dnd/weapons-armor.md, «Магия без настройки»): по
// книге — только обычные свойства, а отмеченное — ещё и это. Строка — только у предмета,
// который требует настройки и что-то магическое умеет.
function WithoutAttunement({
  details,
}: {
  details: { attunement: boolean } & MagicBonusFields & {
      extraDamage?: WeaponExtraDamage[];
    };
}) {
  const extra = details.extraDamage ?? [];
  if (!details.attunement || (details.magicBonus === 0 && extra.length === 0))
    return null;
  const kept = [
    ...(details.bonusWithoutAttunement && details.magicBonus > 0
      ? [`бонус +${details.magicBonus}`]
      : []),
    ...extra
      .filter((part) => part.withoutAttunement)
      .map((part) => `урон ${formatDamage(part)}`),
  ];
  return (
    <DetailsField label="Без настройки">
      {kept.length > 0
        ? `Действует ${kept.join(' и ')}`
        : 'Только обычные свойства'}
    </DetailsField>
  );
}

function WeaponRows({ details }: { details: Weapon }) {
  const group =
    `${details.weaponCategory}${details.attackType === 'melee' ? 'Melee' : 'Ranged'}` as const;
  const bonus = details.magicBonus;
  return (
    <>
      <DetailsField label="Вид">
        {WEAPON_GROUP_LABELS[group]}
        {details.base && ` (${WEAPON_LABELS[details.base].toLowerCase()})`}
      </DetailsField>
      <DetailsField label="Урон">
        {[
          formatDamage(details.damage, bonus),
          ...details.extraDamage.map((part) => formatDamage(part)),
        ].join(' + ')}
        {details.versatile &&
          `; двумя руками ${formatVersatile(details.versatile, bonus)}`}
      </DetailsField>
      <DetailsField label="Свойства">{weaponProperties(details)}</DetailsField>
      <DetailsField label="Мастерство">
        {details.mastery ? WEAPON_MASTERY_LABELS[details.mastery] : '—'}
      </DetailsField>
      {bonus > 0 && (
        <DetailsField label="Бонус магии">
          +{bonus} к атаке и урону
        </DetailsField>
      )}
      <WithoutAttunement details={details} />
    </>
  );
}

// КД доспеха как в таблице книги: «12 + модификатор Ловкости (не более 2)». Бонус магии
// уже прибавлен к числу.
function armorClassText(kind: ArmorKind, armorClass: number): string {
  const cap = ARMOR_DEX_CAP[kind];
  if (cap === 0) return String(armorClass);
  const dex = `${armorClass} + модификатор Ловкости`;
  return cap === null ? dex : `${dex} (не более ${cap})`;
}

function MagicBonus({ bonus }: { bonus: number }) {
  return bonus > 0 ? (
    <DetailsField label="Бонус магии">
      +{bonus} к КД, уже в числе выше
    </DetailsField>
  ) : null;
}

// Поля категорий экипировки на карточке предмета (вариант 1 макета: строками).
function EquipmentDetails({ item }: { item: Item }) {
  switch (item.category) {
    case 'weapon':
      return <WeaponRows details={item.details} />;
    case 'armor': {
      const { details } = item;
      return (
        <>
          <DetailsField label="Вид">
            {ARMOR_KIND_LABELS[details.kind]}
            {details.base &&
              ` (${BOOK_ARMOR_LABELS[details.base].toLowerCase()})`}
          </DetailsField>
          <DetailsField label="КД">
            {armorClassText(
              details.kind,
              details.armorClass + details.magicBonus,
            )}
          </DetailsField>
          <MagicBonus bonus={details.magicBonus} />
          <WithoutAttunement details={details} />
          <DetailsField label="Сила">
            {details.strength === null
              ? '—'
              : `${details.strength}, иначе скорость −10 фт.`}
          </DetailsField>
          <DetailsField label="Скрытность">
            {details.stealthDisadvantage ? 'Помеха' : '—'}
          </DetailsField>
        </>
      );
    }
    case 'shield':
      return (
        <>
          <DetailsField label="КД">
            +{item.details.armorClass + item.details.magicBonus}
          </DetailsField>
          <MagicBonus bonus={item.details.magicBonus} />
          <WithoutAttunement details={item.details} />
        </>
      );
    case 'clothing':
    case 'jewelry':
      return (
        <DetailsField label="Место">
          {WEAR_SLOT_LABELS[item.details.slot]}
        </DetailsField>
      );
    default:
      return null;
  }
}

export default EquipmentDetails;
