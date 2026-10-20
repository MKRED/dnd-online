import { randomInt } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ComfyError,
  type ComfyClient,
  type ComfyHistoryEntry,
} from './comfyClient.js';
import type { StylePreset } from './styles.js';
import { buildGraph, joinPrompt } from './workflow.js';

export interface GenerateRequest {
  prompt: string;
  negative?: string;
  seed?: number;
  width?: number;
  height?: number;
  count?: number;
}

export interface GenerateDeps {
  outputDir: string;
  timeoutMs: number;
  // Подменяются в тестах: пауза между опросами истории и текущее время.
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}

const POLL_MS = 1000;
// Предел seed у KSampler — 2^64, но JSON и JS надёжно держат целые до 2^53.
export const MAX_SEED = Number.MAX_SAFE_INTEGER;

const defaultSleep = (ms: number) =>
  new Promise<void>((done) => setTimeout(done, ms));

// Генерация (docs/plan/ai-access.md, «Сервер comfy»): поставить граф в очередь, дождаться
// его в истории, скачать картинки и сохранить на этот компьютер. Путь к файлу потом
// принимает dnd.upload_image — сама картинка через модель не идёт.
export async function generate(
  comfy: ComfyClient,
  style: StylePreset,
  req: GenerateRequest,
  deps: GenerateDeps,
) {
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? (() => new Date());
  const seed = req.seed ?? randomInt(0, 2 ** 47);
  const stamp = now().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const graph = buildGraph(style, {
    prompt: joinPrompt(style.promptPrefix, req.prompt, style.promptSuffix),
    negative: joinPrompt(style.negative, req.negative ?? ''),
    seed,
    width: req.width ?? style.width,
    height: req.height ?? style.height,
    count: req.count ?? 1,
    filenamePrefix: `dnd/${style.name}`,
  });

  const t0 = Date.now();
  const { prompt_id: promptId } = await comfy.json<{ prompt_id: string }>(
    '/prompt',
    { prompt: graph },
  );
  const entry = await waitForHistory(comfy, promptId, deps.timeoutMs, sleep);
  const images = Object.values(entry.outputs).flatMap((o) => o.images ?? []);
  if (images.length === 0) {
    throw new ComfyError('ComfyUI закончил генерацию, но не вернул картинок.');
  }

  await mkdir(deps.outputDir, { recursive: true });
  const files = await Promise.all(
    images.map(async (image, i) => {
      const query = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder,
        type: image.type,
      });
      const bytes = await comfy.bytes(`/view?${query}`);
      const path = join(
        deps.outputDir,
        `${stamp}-${style.name}-${seed}-${i + 1}.png`,
      );
      await writeFile(path, bytes);
      return { path, bytes };
    }),
  );
  console.error(
    `comfy: ${files.length} картинок за ${Date.now() - t0} мс, стиль ${style.name}, seed ${seed}`,
  );
  return { promptId, seed, files };
}

async function waitForHistory(
  comfy: ComfyClient,
  promptId: string,
  timeoutMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<ComfyHistoryEntry> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const history = await comfy.json<Record<string, ComfyHistoryEntry>>(
      `/history/${promptId}`,
    );
    const entry = history[promptId];
    if (entry?.status?.status_str === 'error') {
      throw new ComfyError(`Генерация упала на ComfyUI: ${failureText(entry)}`);
    }
    if (entry && (entry.status?.completed ?? true)) return entry;
    if (Date.now() >= deadline) {
      throw new ComfyError(
        `ComfyUI не закончил генерацию за ${Math.round(timeoutMs / 1000)} с (задача ${promptId} осталась в его очереди). Если модель грузится впервые, повтори; иначе увеличь COMFY_TIMEOUT_SEC.`,
      );
    }
    await sleep(POLL_MS);
  }
}

// В messages истории ошибка лежит как ['execution_error', {exception_message, node_type}].
function failureText(entry: ComfyHistoryEntry): string {
  const error = entry.status?.messages?.find(
    ([kind]) => kind === 'execution_error',
  )?.[1];
  if (!error) return 'причина не указана';
  return [error.node_type, error.exception_message].filter(Boolean).join(': ');
}
