import sharp from 'sharp';

// Минимальный лист, который примет CreateCharacterDto; тесты меняют поля поверх него.
export function characterBody(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Торин',
    species: 'dwarf',
    background: 'Солдат',
    classes: [{ class: 'fighter', level: 1 }],
    proficiencyBonus: 2,
    abilityScores: {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 8,
    },
    savingThrowProficiencies: ['strength', 'constitution'],
    skillProficiencies: [],
    armorClass: 16,
    speed: 30,
    hitPointsMax: 12,
    hitPointsCurrent: 12,
    hitDie: 10,
    proficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
    personality: {},
    ...over,
  };
}

// Непрозрачный PNG заданного размера — картинка для загрузки.
export function pngImage(width = 400, height = 300): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 60, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

export const PNG_FILE = { filename: 'x.png', contentType: 'image/png' };
