import { DEFAULT_MONSTER_STAT_BLOCK, type Monster } from 'shared';

// Аболет из книги 2024 — монстр со всеми частями стат-блока: особые скорости, владения
// спасбросками, навыки, чувства, логово и колдовство.
export const sampleMonster: Monster = {
  id: '6f0f8a52-9d0e-4c43-9a43-5d9f5a1d2c11',
  authorId: 'author-1',
  authorNickname: 'claude_smoketest',
  isPublic: true,
  name: 'Аболет',
  description: 'Древний обитатель подземных озёр.',
  sources: ['Monster Manual 2024'],
  image: null,
  createdAt: '2026-10-19T10:00:00.000Z',
  updatedAt: '2026-10-19T10:00:00.000Z',
  category: 'aberration',
  role: 'unique',
  statBlock: {
    ...DEFAULT_MONSTER_STAT_BLOCK,
    size: 'large',
    alignment: 'законно-злой',
    armorClass: 17,
    initiative: 7,
    hitPoints: { average: 150, dice: { count: 20, die: 10, bonus: 40 } },
    speed: { ...DEFAULT_MONSTER_STAT_BLOCK.speed, walk: 10, swim: 40 },
    abilities: {
      strength: { score: 21, save: 5 },
      dexterity: { score: 9, save: 3 },
      constitution: { score: 15, save: 6 },
      intelligence: { score: 18, save: 8 },
      wisdom: { score: 15, save: 6 },
      charisma: { score: 18, save: 4 },
    },
    skills: [
      { skill: 'history', bonus: 12 },
      { skill: 'perception', bonus: 10 },
    ],
    senses: [{ sense: 'darkvision', range: 120 }],
    passivePerception: 20,
    languages: 'Глубинная речь, телепатия 120 фт.',
    challenge: '10',
    lairXp: 7200,
    legendaryActions: 3,
    legendaryActionsLair: 4,
    spellcasting: { ability: 'intelligence', saveDc: 16, attackBonus: null },
  },
};
