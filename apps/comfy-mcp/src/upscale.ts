import type { StylePreset } from './styles.js';
import type { ComfyGraph, GenerateParams } from './workflow.js';

// Увеличение после txt2img (этап 6 docs/plan/ai-access.md). SDXL рисует чисто только около
// 1024 px: больше — и он дублирует объекты, поэтому картинку сначала рисуют в родном
// размере, а потом увеличивают.
//   - Без denoise — только модель апскейла (ESRGAN и родня): быстро, края резче, но новых
//     деталей нет.
//   - С denoise — hires fix: увеличенную картинку чекпоинт перерисовывает вторым проходом
//     с малым denoise, и в ней появляются настоящие мелкие детали (шерсть, гравировка).
// Модели апскейла увеличивают в свой фиксированный раз (обычно 4x), поэтому после них
// картинка масштабируется до width·scale × height·scale.
export function addUpscale(
  graph: ComfyGraph,
  style: StylePreset,
  p: GenerateParams,
): ComfyGraph {
  const up = style.upscale;
  if (!up) return graph;
  const width = roundTo8(p.width * up.scale);
  const height = roundTo8(p.height * up.scale);
  const sampler = graph.sampler!;
  const nodes: ComfyGraph = {
    upscaleModel: {
      class_type: 'UpscaleModelLoader',
      inputs: { model_name: up.model },
    },
    upscaleByModel: {
      class_type: 'ImageUpscaleWithModel',
      inputs: { upscale_model: ['upscaleModel', 0], image: ['decode', 0] },
    },
    upscaleResize: {
      class_type: 'ImageScale',
      inputs: {
        image: ['upscaleByModel', 0],
        upscale_method: 'lanczos',
        width,
        height,
        crop: 'disabled',
      },
    },
  };
  let image: [string, number] = ['upscaleResize', 0];
  if (up.denoise !== undefined) {
    Object.assign(nodes, {
      hiresEncode: {
        class_type: 'VAEEncode',
        inputs: { pixels: image, vae: ['checkpoint', 2] },
      },
      hiresSampler: {
        class_type: 'KSampler',
        inputs: {
          ...sampler.inputs,
          steps: up.steps ?? style.steps,
          denoise: up.denoise,
          latent_image: ['hiresEncode', 0],
        },
      },
      hiresDecode: {
        class_type: 'VAEDecode',
        inputs: { samples: ['hiresSampler', 0], vae: ['checkpoint', 2] },
      },
    });
    image = ['hiresDecode', 0];
  }
  return {
    ...graph,
    ...nodes,
    save: {
      ...graph.save!,
      inputs: { ...graph.save!.inputs, images: image },
    },
  };
}

const roundTo8 = (n: number) => Math.round(n / 8) * 8;
