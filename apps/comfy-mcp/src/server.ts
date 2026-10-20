import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ComfyError, createComfyClient, type Fetch } from './comfyClient.js';
import type { ComfyConfig } from './config.js';
import { generate, MAX_SEED, type GenerateDeps } from './generate.js';
import { previewOf } from './preview.js';
import { readStatus } from './status.js';
import { loadStyle } from './styles.js';

const text = (value: string): CallToolResult => ({
  content: [{ type: 'text', text: value }],
});

// Ошибки ComfyUI и пресетов возвращаются модели как результат с isError: она видит, что
// не так («ComfyUI недоступен…», «Нет стиля…»), и может сказать пользователю.
async function guarded(
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ComfyError)
      return { ...text(err.message), isError: true };
    console.error('comfy MCP tool failed', err);
    throw err;
  }
}

const MAX_COUNT = 4;
const side = z.number().int().min(64).max(2048).multipleOf(8);

// Сервер comfy: только генерация картинок, про DnD ничего не знает
// (docs/plan/ai-access.md, «Два MCP-сервера»).
export function createComfyMcpServer(
  config: ComfyConfig,
  fetchFn: Fetch = fetch,
  deps: Pick<GenerateDeps, 'sleep' | 'now'> = {},
): McpServer {
  const server = new McpServer({ name: 'comfy', version: '0.1.0' });

  server.registerTool(
    'comfy_status',
    {
      description:
        'Доступен ли ComfyUI, его видеокарта и очередь, модели (checkpoints) и LoRA на нём и пресеты стилей с отметкой, есть ли их модель. Вызови перед первой генерацией.',
    },
    () =>
      guarded(async () => {
        const status = await readStatus(config, fetchFn);
        return {
          ...text(JSON.stringify(status, null, 2)),
          ...(status.comfy.available ? {} : { isError: true }),
        };
      }),
  );

  server.registerTool(
    'generate',
    {
      description: `Нарисовать картинку на ComfyUI в стиле пресета. prompt — только сюжет по-английски (что изображено, поза, фон, свет), стиль, качество и негатив подставляет пресет. Ответ — пути к PNG на этом компьютере (их принимает dnd.upload_image), seed и превью. Посмотри превью и сравни с задумкой; если не то — поправь prompt или seed, но не больше трёх попыток на картинку, потом покажи пользователю лучшие и спроси. Мелкие дефекты (пальцы, надписи) на превью можно не заметить. count — сколько вариантов за раз (до ${MAX_COUNT}), seed — повторить или чуть поменять удачный вариант.`,
      inputSchema: {
        style: z.string().min(1).describe('Имя пресета из comfy_status'),
        prompt: z.string().min(1).max(2000),
        negative: z.string().max(1000).optional(),
        seed: z.number().int().min(0).max(MAX_SEED).optional(),
        width: side.optional(),
        height: side.optional(),
        count: z.number().int().min(1).max(MAX_COUNT).optional(),
      },
    },
    ({ style: name, ...req }) =>
      guarded(async () => {
        const comfy = createComfyClient(config.url, fetchFn);
        const style = await loadStyle(config.stylesDir, name);
        const result = await generate(comfy, style, req, {
          outputDir: config.outputDir,
          timeoutMs: config.timeoutMs,
          ...deps,
        });
        const previews = await Promise.all(
          result.files.map((f) => previewOf(f.bytes)),
        );
        const summary = {
          style: style.name,
          seed: result.seed,
          images: result.files.map((f, i) => ({
            path: f.path,
            width: previews[i]?.width,
            height: previews[i]?.height,
          })),
        };
        return {
          content: [
            { type: 'text', text: JSON.stringify(summary, null, 2) },
            ...previews.map((p) => ({
              type: 'image' as const,
              data: p.base64,
              mimeType: 'image/jpeg',
            })),
          ],
        };
      }),
  );

  return server;
}
