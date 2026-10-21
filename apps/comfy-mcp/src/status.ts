import { createComfyClient, ComfyError, type Fetch } from './comfyClient.js';
import type { ComfyConfig } from './config.js';
import { loadStyles } from './styles.js';

interface SystemStats {
  system?: { comfyui_version?: string };
  devices?: { name: string; vram_total?: number; vram_free?: number }[];
}
interface QueueState {
  queue_running?: unknown[];
  queue_pending?: unknown[];
}

const gb = (bytes: number | undefined) =>
  bytes === undefined ? undefined : Math.round((bytes / 1024 ** 3) * 10) / 10;

// Что знает comfy_status. Пресеты читаются и без ComfyUI: так модель видит стили, даже
// если компьютер с видеокартой выключен.
export async function readStatus(config: ComfyConfig, fetchFn: Fetch) {
  const styles = await loadStyles(config.stylesDir);
  try {
    const comfy = createComfyClient(config.url, fetchFn);
    const [stats, queue, checkpoints, loras, upscaleModels] = await Promise.all(
      [
        comfy.json<SystemStats>('/system_stats'),
        comfy.json<QueueState>('/queue'),
        comfy.json<string[]>('/models/checkpoints'),
        comfy.json<string[]>('/models/loras'),
        comfy.json<string[]>('/models/upscale_models'),
      ],
    );
    const installed = [...checkpoints, ...loras, ...upscaleModels];
    return {
      comfy: {
        available: true,
        url: comfy.url,
        version: stats.system?.comfyui_version,
        devices: (stats.devices ?? []).map((d) => ({
          name: d.name,
          vramTotalGb: gb(d.vram_total),
          vramFreeGb: gb(d.vram_free),
        })),
        queue: {
          running: queue.queue_running?.length ?? 0,
          pending: queue.queue_pending?.length ?? 0,
        },
        checkpoints,
        loras,
        upscaleModels,
      },
      styles: styles.map((s) => ({
        name: s.name,
        description: s.description,
        checkpoint: s.checkpoint,
        // Чего из пресета нет на ComfyUI: генерация с ним упадёт.
        missing: [
          s.checkpoint,
          ...s.loras.map((l) => l.name),
          ...(s.upscale ? [s.upscale.model] : []),
        ].filter((file) => !installed.includes(file)),
      })),
    };
  } catch (err) {
    if (!(err instanceof ComfyError)) throw err;
    return {
      comfy: { available: false, url: config.url, error: err.message },
      styles: styles.map(({ name, description, checkpoint }) => ({
        name,
        description,
        checkpoint,
      })),
    };
  }
}
