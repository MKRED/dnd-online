import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { INVENTORY_LOCATIONS } from 'shared';
import { z } from 'zod';
import { DndApiError, type ApiCall } from './apiClient.js';
import { json, type Guarded } from './toolResult.js';

// Связи записей (docs/plan/ai-access.md, этап 3): предметы, способности и эффекты у
// персонажа, НПС и монстра. Сервер молча вырезает поля, которых у связи нет, поэтому
// лишнее поле здесь — ошибка, а не тишина: иначе модель решила бы, что оно сохранилось.
const OWNERS = ['character', 'npc', 'monster'] as const;
const TARGETS = ['item', 'ability', 'effect'] as const;
type Owner = (typeof OWNERS)[number];
type Target = (typeof TARGETS)[number];

const TARGET_PATH: Record<Target, string> = {
  item: 'items',
  ability: 'abilities',
  effect: 'effects',
};
const TARGET_ID: Record<Target, string> = {
  item: 'itemId',
  ability: 'abilityId',
  effect: 'effectId',
};

type Field = 'quantity' | 'location' | 'unpack' | 'prepared' | 'perDay';
type Pair = `${'character' | 'monster'}.${Target}`;

// Какие поля принимает связь при добавлении и при правке.
const ADD_FIELDS: Record<Pair, Field[]> = {
  'character.item': ['quantity', 'location', 'unpack'],
  'character.ability': [],
  'character.effect': [],
  'monster.item': ['quantity'],
  'monster.ability': ['perDay'],
  'monster.effect': [],
};
const UPDATE_FIELDS: Record<Pair, Field[]> = {
  'character.item': ['quantity', 'location'],
  'character.ability': ['prepared'],
  'character.effect': [],
  'monster.item': ['quantity'],
  'monster.ability': ['perDay'],
  'monster.effect': [],
};
// Без количества и места предмет кладётся одной штукой «при себе».
const ADD_DEFAULTS: Partial<Record<Pair, Record<string, unknown>>> = {
  'character.item': { quantity: 1, location: 'carried' },
  'monster.item': { quantity: 1 },
};

const pairOf = (owner: Owner, target: Target): Pair =>
  `${owner === 'monster' ? 'monster' : 'character'}.${target}`;

const linksPath = (owner: Owner, ownerId: string, target: Target) =>
  `/${owner === 'monster' ? 'monsters' : 'characters'}/${ownerId}/${TARGET_PATH[target]}`;

function pickFields(
  pair: Pair,
  allowed: Field[],
  given: Partial<Record<Field, unknown>>,
) {
  const body: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(given)) {
    if (value === undefined) continue;
    if (!allowed.includes(field as Field)) {
      const fit = allowed.length
        ? `она принимает ${allowed.join(', ')}`
        : 'своих полей у неё нет';
      throw new DndApiError(`У связи ${pair} нет поля ${field}: ${fit}.`);
    }
    body[field] = value;
  }
  return body;
}

const fields = {
  quantity: z.number().int().min(1).optional(),
  location: z.enum(INVENTORY_LOCATIONS).optional(),
  unpack: z.boolean().optional(),
  prepared: z.boolean().optional(),
  perDay: z.number().int().min(1).nullable().optional(),
};
const link = {
  owner: z.enum(OWNERS).describe('Чей список: персонажа, НПС или монстра'),
  ownerId: z.uuid(),
  target: z.enum(TARGETS).describe('Что связано: предмет, способность, эффект'),
};

export function registerLinkTools(
  server: McpServer,
  api: ApiCall,
  guarded: Guarded,
) {
  server.registerTool(
    'link_add',
    {
      description: `Добавить предмет, способность или эффект каталога персонажу, НПС или монстру. targetId — id из search. Поля по связи: предмет персонажу — quantity (по умолчанию 1), location (${INVENTORY_LOCATIONS.join(' или ')}, по умолчанию carried — при себе), unpack (набор кладётся своим составом); предмет монстру — quantity (повтор того же предмета — 409, меняй количество через link_update); способность монстру — perDay (заклинание N раз в день, иначе null), а способности категории monster бывают только у монстров; эффект — без полей, один эффект на существе один раз. Ответ — весь список связей этого вида с id строк.`,
      inputSchema: { ...link, targetId: z.uuid(), ...fields },
    },
    ({ owner, ownerId, target, targetId, ...given }) =>
      guarded(async () => {
        const pair = pairOf(owner, target);
        const body = {
          ...ADD_DEFAULTS[pair],
          ...pickFields(pair, ADD_FIELDS[pair], given),
          [TARGET_ID[target]]: targetId,
        };
        return json(
          await api<unknown>(linksPath(owner, ownerId, target), {
            method: 'POST',
            body,
          }),
        );
      }),
  );

  server.registerTool(
    'link_update',
    {
      description:
        'Поправить строку связи. entryId — id строки из get (inventory[].id, abilities[].id, items[].id у монстра), не id записи каталога. Предмет персонажа — quantity, location (перенос туда, где предмет уже есть, складывает строки); предмет монстра — quantity; способность персонажа — prepared (подготовлено ли заклинание); способность монстра — perDay. У эффекта менять нечего.',
      inputSchema: { ...link, entryId: z.uuid(), ...fields },
    },
    ({ owner, ownerId, target, entryId, ...given }) =>
      guarded(async () => {
        const pair = pairOf(owner, target);
        const body = pickFields(pair, UPDATE_FIELDS[pair], given);
        if (Object.keys(body).length === 0) {
          throw new DndApiError(
            `Нечего менять: передай одно из полей связи ${pair}.`,
          );
        }
        return json(
          await api<unknown>(
            `${linksPath(owner, ownerId, target)}/${entryId}`,
            {
              method: 'PATCH',
              body,
            },
          ),
        );
      }),
  );

  server.registerTool(
    'link_remove',
    {
      description:
        'Убрать строку связи (предмет из инвентаря, способность или эффект с существа). entryId — id строки из get. Сама запись каталога остаётся.',
      inputSchema: { ...link, entryId: z.uuid() },
    },
    ({ owner, ownerId, target, entryId }) =>
      guarded(async () =>
        json(
          await api<unknown>(
            `${linksPath(owner, ownerId, target)}/${entryId}`,
            {
              method: 'DELETE',
            },
          ),
        ),
      ),
  );
}
