import type { StylePreset } from './styles.js';

// Граф ComfyUI в формате API: узлы по номерам, вход — значение или ссылка [узел, выход].
type Input = string | number | boolean | [string, number];
export type ComfyGraph = Record<
  string,
  { class_type: string; inputs: Record<string, Input> }
>;

export interface GenerateParams {
  prompt: string;
  negative: string;
  seed: number;
  width: number;
  height: number;
  count: number;
  filenamePrefix: string;
}

// txt2img для моделей с одним чекпоинтом (SD 1.5, SDXL и их дообучения): чекпоинт,
// цепочка LoRA, два текста, пустой латент, сэмплер, декодер, сохранение. Модели с
// раздельными UNet и текстовыми кодировщиками (Flux) получат свой граф на этапе 6, когда
// выберем модели.
function txt2img(style: StylePreset, p: GenerateParams): ComfyGraph {
  const graph: ComfyGraph = {
    checkpoint: {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: style.checkpoint },
    },
  };
  let model: [string, number] = ['checkpoint', 0];
  let clip: [string, number] = ['checkpoint', 1];
  style.loras.forEach((lora, i) => {
    const id = `lora${i}`;
    graph[id] = {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: lora.name,
        strength_model: lora.strength,
        strength_clip: lora.strength,
        model,
        clip,
      },
    };
    model = [id, 0];
    clip = [id, 1];
  });
  return {
    ...graph,
    positive: {
      class_type: 'CLIPTextEncode',
      inputs: { text: p.prompt, clip },
    },
    negative: {
      class_type: 'CLIPTextEncode',
      inputs: { text: p.negative, clip },
    },
    latent: {
      class_type: 'EmptyLatentImage',
      inputs: { width: p.width, height: p.height, batch_size: p.count },
    },
    sampler: {
      class_type: 'KSampler',
      inputs: {
        seed: p.seed,
        steps: style.steps,
        cfg: style.cfg,
        sampler_name: style.sampler,
        scheduler: style.scheduler,
        denoise: 1,
        model,
        positive: ['positive', 0],
        negative: ['negative', 0],
        latent_image: ['latent', 0],
      },
    },
    decode: {
      class_type: 'VAEDecode',
      inputs: { samples: ['sampler', 0], vae: ['checkpoint', 2] },
    },
    save: {
      class_type: 'SaveImage',
      inputs: { filename_prefix: p.filenamePrefix, images: ['decode', 0] },
    },
  };
}

const WORKFLOWS = { txt2img } as const;
export const WORKFLOW_NAMES = Object.keys(WORKFLOWS) as [
  keyof typeof WORKFLOWS,
];

export const buildGraph = (style: StylePreset, params: GenerateParams) =>
  WORKFLOWS[style.workflow](style, params);

// Сюжет модели в обрамлении пресета: стиль задают префикс и суффикс.
export const joinPrompt = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
