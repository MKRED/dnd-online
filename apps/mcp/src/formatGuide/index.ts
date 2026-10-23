import type { EntityKind } from '../entityKinds.js';
import { abilityGuide } from './ability.js';
import { blockGroupGuide } from './blockGroup.js';
import { characterGuide } from './character.js';
import { effectGuide } from './effect.js';
import { furnitureGuide } from './furniture.js';
import { itemGuide } from './item.js';
import { monsterGuide } from './monster.js';
import { voxelModelGuide } from './voxelModel.js';

const GUIDES: Record<EntityKind, () => string[]> = {
  character: () => characterGuide('pc'),
  npc: () => characterGuide('npc'),
  monster: monsterGuide,
  item: itemGuide,
  ability: abilityGuide,
  effect: effectGuide,
  block_group: blockGroupGuide,
  voxel_model: voxelModelGuide,
  furniture: furnitureGuide,
};

// Справка по полям для create и update (docs/plan/ai-access.md, этап 3). Значения
// перечислений и заготовки берутся из shared, описания полей проверяет компилятор:
// новое поле или вид в shared без строки здесь не соберётся.
export function buildFormatGuide(kind: EntityKind): string {
  return [
    'ПРАВИЛА',
    '- Игра идёт по правилам DnD 5e редакции 2024. Стат-блоки, заклинания и предметы бери из книг 2024 (Player’s Handbook, Monster Manual, Dungeon Master’s Guide), а не придумывай. Чего в книгах нет — самоделка: так и напиши в описании и в sources.',
    '- Всё создаётся скрытым, публикует пользователь сам. Удалять через токен нельзя.',
    '- Образец целиком — get опубликованной записи этого вида из search.',
    '- Ошибку в данных сервер объяснит по-русски: исправь и повтори.',
    '',
    ...GUIDES[kind](),
  ].join('\n');
}
