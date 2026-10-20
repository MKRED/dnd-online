import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { ComfyError } from './comfyClient.js';
import { WORKFLOW_NAMES } from './workflow.js';

// Пресет стиля — файл apps/comfy-mcp/styles/<имя>.json (docs/plan/ai-access.md, «Стили»).
// Модель пишет только сюжет, а модель ComfyUI, LoRA, сэмплер, шаги и обрамление промпта
// берутся отсюда: так крыса и зелье выходят в одном стиле.
const presetSchema = z.object({
  description: z.string(),
  // Граф, который строит workflow.ts.
  workflow: z.enum(WORKFLOW_NAMES),
  checkpoint: z.string().min(1),
  loras: z
    .array(z.object({ name: z.string().min(1), strength: z.number() }))
    .default([]),
  sampler: z.string().min(1),
  scheduler: z.string().min(1),
  steps: z.number().int().min(1).max(150),
  cfg: z.number().min(0).max(30),
  width: z.number().int().min(64).max(4096).multipleOf(8),
  height: z.number().int().min(64).max(4096).multipleOf(8),
  promptPrefix: z.string().default(''),
  promptSuffix: z.string().default(''),
  negative: z.string().default(''),
});

export type StylePreset = z.infer<typeof presetSchema> & { name: string };

// Читается при каждом вызове: пресет правят руками, перезапускать Claude Code ради этого
// не нужно.
export async function loadStyles(dir: string): Promise<StylePreset[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(
    files.map(async (file) => {
      const name = basename(file, '.json');
      let raw: unknown;
      try {
        raw = JSON.parse(await readFile(join(dir, file), 'utf8'));
      } catch (err) {
        throw new ComfyError(`Пресет ${file} — не JSON: ${String(err)}`);
      }
      const parsed = presetSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ComfyError(
          `Пресет ${file} задан неверно: ${parsed.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`).join('; ')}`,
        );
      }
      return { ...parsed.data, name };
    }),
  );
}

export async function loadStyle(
  dir: string,
  name: string,
): Promise<StylePreset> {
  const styles = await loadStyles(dir);
  const style = styles.find((s) => s.name === name);
  if (!style) {
    throw new ComfyError(
      `Нет стиля «${name}». Есть: ${styles.map((s) => s.name).join(', ') || 'ни одного'} (apps/comfy-mcp/styles/).`,
    );
  }
  return style;
}
