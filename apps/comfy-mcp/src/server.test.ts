import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readConfig, type ComfyConfig } from './config.js';
import { loadStyles } from './styles.js';
import { fakeComfy, pngImage } from './testing/fakeComfy.js';
import { call, connect, textOf } from './testing/mcpClient.js';
import type { ComfyGraph } from './workflow.js';

const PRESET = {
  description: 'Тестовый стиль',
  workflow: 'txt2img',
  checkpoint: 'darkModel.safetensors',
  loras: [{ name: 'grim.safetensors', strength: 0.7 }],
  sampler: 'euler',
  scheduler: 'normal',
  steps: 20,
  cfg: 5,
  width: 1024,
  height: 1024,
  promptPrefix: 'dark fantasy',
  negative: 'blurry',
};

let dir: string;
let config: ComfyConfig;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'comfy-mcp-'));
  config = {
    url: 'http://26.0.0.1:8188',
    outputDir: join(dir, 'output'),
    stylesDir: dir,
    timeoutMs: 60_000,
  };
  await writeFile(join(dir, 'grim.json'), JSON.stringify(PRESET));
});

afterEach(() => rm(dir, { recursive: true, force: true }));

// ComfyUI, который выполняет задачу со второго опроса истории.
async function workingComfy() {
  const queued: ComfyGraph[] = [];
  let polls = 0;
  const png = await pngImage();
  const fetchFn = fakeComfy({
    'POST /prompt': (body) => {
      queued.push((body as { prompt: ComfyGraph }).prompt);
      return { prompt_id: 'p1', number: 1, node_errors: {} };
    },
    'GET /history/p1': () =>
      ++polls < 2
        ? {}
        : {
            p1: {
              outputs: {
                save: {
                  images: [
                    { filename: 'a.png', subfolder: 'dnd', type: 'output' },
                    { filename: 'b.png', subfolder: 'dnd', type: 'output' },
                  ],
                },
              },
              status: { status_str: 'success', completed: true },
            },
          },
    'GET /view': png,
  });
  return { fetchFn, queued, png };
}

describe('generate', () => {
  it('ставит граф пресета в очередь, ждёт и сохраняет картинки с превью', async () => {
    const { fetchFn, queued, png } = await workingComfy();
    const client = await connect(config, fetchFn);

    const result = await call(client, 'generate', {
      style: 'grim',
      prompt: 'giant rat in a sewer',
      seed: 42,
      count: 2,
    });

    expect(result.isError).toBeFalsy();
    const graph = queued[0]!;
    expect(graph.positive?.inputs.text).toBe(
      'dark fantasy, giant rat in a sewer',
    );
    expect(graph.negative?.inputs.text).toBe('blurry');
    expect(graph.sampler?.inputs).toMatchObject({
      seed: 42,
      steps: 20,
      cfg: 5,
    });
    expect(graph.latent?.inputs).toMatchObject({ batch_size: 2, width: 1024 });
    // LoRA встаёт между чекпоинтом и сэмплером.
    expect(graph.lora0?.inputs.model).toEqual(['checkpoint', 0]);
    expect(graph.sampler?.inputs.model).toEqual(['lora0', 0]);

    const summary = JSON.parse(textOf(result)) as {
      seed: number;
      images: { path: string; width: number }[];
    };
    expect(summary.seed).toBe(42);
    expect(summary.images).toHaveLength(2);
    expect(summary.images[0]?.width).toBe(1024);
    expect(await readFile(summary.images[0]!.path)).toEqual(png);
    expect(summary.images[0]?.path).toContain(
      '2026-10-20T12-00-00-grim-42-1.png',
    );

    const preview = result.content[1];
    expect(preview?.type).toBe('image');
    const meta = await sharp(
      Buffer.from(preview?.type === 'image' ? preview.data : '', 'base64'),
    ).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 512, 384]);
  });

  it('без seed берёт случайный и возвращает его', async () => {
    const { fetchFn, queued } = await workingComfy();
    const client = await connect(config, fetchFn);
    const result = await call(client, 'generate', {
      style: 'grim',
      prompt: 'rat',
    });
    const { seed } = JSON.parse(textOf(result)) as { seed: number };
    expect(queued[0]?.sampler?.inputs.seed).toBe(seed);
  });

  it('без адреса объясняет, где его задать', async () => {
    const client = await connect({ ...config, url: undefined }, fakeComfy({}));
    const result = await call(client, 'generate', {
      style: 'grim',
      prompt: 'rat',
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('COMFY_URL');
  });

  it('выключенный ComfyUI — понятная ошибка', async () => {
    const down = () => Promise.reject(new TypeError('fetch failed'));
    const client = await connect(config, down);
    const result = await call(client, 'generate', {
      style: 'grim',
      prompt: 'rat',
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(
      'ComfyUI недоступен по адресу http://26.0.0.1:8188',
    );
  });

  it('ошибку графа отдаёт текстом узла', async () => {
    const fetchFn = fakeComfy({});
    fetchFn.mockImplementationOnce(() =>
      Promise.resolve(
        Response.json(
          {
            error: { message: 'Prompt outputs failed validation' },
            node_errors: {
              checkpoint: {
                class_type: 'CheckpointLoaderSimple',
                errors: [
                  {
                    message: 'Value not in list',
                    details: 'ckpt_name: darkModel',
                  },
                ],
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const client = await connect(config, fetchFn);
    const result = await call(client, 'generate', {
      style: 'grim',
      prompt: 'rat',
    });
    expect(textOf(result)).toBe(
      'ComfyUI ответил HTTP 400 на /prompt: Prompt outputs failed validation; CheckpointLoaderSimple: Value not in list ckpt_name: darkModel',
    );
  });

  it('падение генерации на ComfyUI и истёкшее ожидание', async () => {
    const failing = fakeComfy({
      'POST /prompt': () => ({ prompt_id: 'p1' }),
      'GET /history/p1': () => ({
        p1: {
          outputs: {},
          status: {
            status_str: 'error',
            messages: [
              [
                'execution_error',
                {
                  node_type: 'KSampler',
                  exception_message: 'CUDA out of memory',
                },
              ],
            ],
          },
        },
      }),
    });
    const failed = await call(await connect(config, failing), 'generate', {
      style: 'grim',
      prompt: 'rat',
    });
    expect(textOf(failed)).toBe(
      'Генерация упала на ComfyUI: KSampler: CUDA out of memory',
    );

    const stuck = fakeComfy({
      'POST /prompt': () => ({ prompt_id: 'p1' }),
      'GET /history/p1': () => ({}),
    });
    const timedOut = await call(
      await connect({ ...config, timeoutMs: 0 }, stuck),
      'generate',
      { style: 'grim', prompt: 'rat' },
    );
    expect(textOf(timedOut)).toContain('не закончил генерацию');
  });

  it('неизвестный стиль — список имеющихся', async () => {
    const client = await connect(config, fakeComfy({}));
    const result = await call(client, 'generate', {
      style: 'nope',
      prompt: 'rat',
    });
    expect(textOf(result)).toBe(
      'Нет стиля «nope». Есть: grim (apps/comfy-mcp/styles/).',
    );
  });
});

describe('comfy_status', () => {
  it('видеокарта, модели и чего не хватает пресету', async () => {
    const fetchFn = fakeComfy({
      'GET /system_stats': () => ({
        system: { comfyui_version: '0.3.60' },
        devices: [
          { name: 'NVIDIA GeForce RTX 5070 Ti', vram_total: 17_179_869_184 },
        ],
      }),
      'GET /queue': () => ({ queue_running: [], queue_pending: [[1]] }),
      'GET /models/checkpoints': () => ['darkModel.safetensors'],
      'GET /models/loras': () => [],
    });
    const result = await call(await connect(config, fetchFn), 'comfy_status');
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(textOf(result))).toMatchObject({
      comfy: {
        available: true,
        devices: [{ name: 'NVIDIA GeForce RTX 5070 Ti', vramTotalGb: 16 }],
        queue: { running: 0, pending: 1 },
      },
      styles: [{ name: 'grim', missing: ['grim.safetensors'] }],
    });
  });

  it('без ComfyUI всё равно показывает стили', async () => {
    const down = () => Promise.reject(new TypeError('fetch failed'));
    const result = await call(await connect(config, down), 'comfy_status');
    expect(result.isError).toBe(true);
    expect(JSON.parse(textOf(result))).toMatchObject({
      comfy: { available: false },
      styles: [{ name: 'grim' }],
    });
  });
});

describe('пресеты', () => {
  it('пресеты из apps/comfy-mcp/styles читаются', async () => {
    const styles = await loadStyles(readConfig({}).stylesDir);
    expect(styles.map((s) => s.name)).toEqual([
      'dark-fantasy-creature',
      'dark-fantasy-item',
    ]);
  });

  it('испорченный пресет называет поле', async () => {
    await writeFile(
      join(dir, 'grim.json'),
      JSON.stringify({ ...PRESET, steps: 0 }),
    );
    const result = await call(
      await connect(config, fakeComfy({})),
      'generate',
      {
        style: 'grim',
        prompt: 'rat',
      },
    );
    expect(textOf(result)).toContain('Пресет grim.json задан неверно: steps');
  });
});
