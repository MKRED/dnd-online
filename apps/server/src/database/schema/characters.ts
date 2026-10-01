import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  AbilityScore,
  CharacterAttack,
  CharacterClassLevel,
  CharacterCurrency,
  CharacterFeature,
  CharacterPersonality,
  CharacterProficiencies,
  InventoryItem,
  KnownSpell,
  SkillProficiency,
  SpellSlots,
  WeaponMasteries,
} from 'shared';
import { users } from './users.js';

// Гибридная схема: часто меняющиеся точечно скаляры (ХП, КД, спасброски от смерти) —
// обычные колонки, чтобы их можно было апдейтить по одному полю без перезаписи всего чарника.
// Переменные по длине списки (заклинания, инвентарь, фичи и т.д.) — типизированный jsonb,
// типы общие с фронтом через пакет shared. Ориентируемся на правила редакции 2024
// (race → species, бонусы характеристик от background, а не от species).
export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 100 }).notNull(),
  species: varchar('species', { length: 50 }).notNull(),
  background: varchar('background', { length: 50 }).notNull(),
  alignment: varchar('alignment', { length: 30 }),
  experiencePoints: integer('experience_points').notNull().default(0),

  classes: jsonb('classes').notNull().$type<CharacterClassLevel[]>(),
  proficiencyBonus: integer('proficiency_bonus').notNull().default(2),

  strength: integer('strength').notNull(),
  dexterity: integer('dexterity').notNull(),
  constitution: integer('constitution').notNull(),
  intelligence: integer('intelligence').notNull(),
  wisdom: integer('wisdom').notNull(),
  charisma: integer('charisma').notNull(),

  savingThrowProficiencies: jsonb('saving_throw_proficiencies')
    .notNull()
    .$type<AbilityScore[]>(),
  skillProficiencies: jsonb('skill_proficiencies')
    .notNull()
    .$type<SkillProficiency[]>(),

  armorClass: integer('armor_class').notNull(),
  speed: integer('speed').notNull(),
  hitPointsMax: integer('hit_points_max').notNull(),
  hitPointsCurrent: integer('hit_points_current').notNull(),
  hitPointsTemp: integer('hit_points_temp').notNull().default(0),
  deathSaveSuccesses: integer('death_save_successes').notNull().default(0),
  deathSaveFailures: integer('death_save_failures').notNull().default(0),
  heroicInspiration: boolean('heroic_inspiration').notNull().default(false),

  proficiencies: jsonb('proficiencies')
    .notNull()
    .$type<CharacterProficiencies>(),
  weaponMasteries: jsonb('weapon_masteries')
    .notNull()
    .$type<WeaponMasteries>()
    .default([]),
  attacks: jsonb('attacks').notNull().$type<CharacterAttack[]>().default([]),

  spellSlots: jsonb('spell_slots').notNull().$type<SpellSlots>().default({}),
  spellsKnown: jsonb('spells_known')
    .notNull()
    .$type<KnownSpell[]>()
    .default([]),

  inventory: jsonb('inventory').notNull().$type<InventoryItem[]>().default([]),
  currency: jsonb('currency').notNull().$type<CharacterCurrency>(),

  features: jsonb('features').notNull().$type<CharacterFeature[]>().default([]),
  personality: jsonb('personality').notNull().$type<CharacterPersonality>(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Обновляется самим drizzle ($onUpdate) при любом UPDATE через ORM — и полном
  // редактировании, и точечном PATCH. По нему сортируется список персонажей.
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
