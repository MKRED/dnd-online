import { describe, expect, it } from 'vitest';
import type { StylePreset } from './styles.js';
import { buildGraph, type GenerateParams } from './workflow.js';

const STYLE: StylePreset = {
  name: 'grim',
  description: 'Тестовый стиль',
  workflow: 'txt2img',
  checkpoint: 'darkModel.safetensors',
  loras: [{ name: 'grim.safetensors', strength: 0.7 }],
  sampler: 'euler',
  scheduler: 'normal',
  steps: 30,
  cfg: 5,
  width: 1024,
  height: 1024,
  promptPrefix: '',
  promptSuffix: '',
  negative: '',
};

const PARAMS: GenerateParams = {
  prompt: 'rat',
  negative: 'blurry',
  seed: 7,
  width: 832,
  height: 1216,
  count: 1,
  filenamePrefix: 'dnd/grim',
};

describe('апскейл после txt2img', () => {
  it('без upscale сохраняется картинка первого прохода', () => {
    const graph = buildGraph(STYLE, PARAMS);
    expect(graph.save?.inputs.images).toEqual(['decode', 0]);
    expect(graph.upscaleModel).toBeUndefined();
  });

  it('только моделью: увеличение и масштаб до width·scale, без второго прохода', () => {
    const graph = buildGraph(
      { ...STYLE, upscale: { model: '4x-UltraSharp.pth', scale: 1.5 } },
      PARAMS,
    );
    expect(graph.upscaleModel?.inputs.model_name).toBe('4x-UltraSharp.pth');
    expect(graph.upscaleByModel?.inputs.image).toEqual(['decode', 0]);
    // 832·1.5 = 1248, 1216·1.5 = 1824 — оба кратны 8.
    expect(graph.upscaleResize?.inputs).toMatchObject({
      width: 1248,
      height: 1824,
    });
    expect(graph.hiresSampler).toBeUndefined();
    expect(graph.save?.inputs.images).toEqual(['upscaleResize', 0]);
  });

  it('hires fix: второй проход тем же сэмплером с denoise поверх увеличенной', () => {
    const graph = buildGraph(
      {
        ...STYLE,
        upscale: { model: '4x-UltraSharp.pth', scale: 1.5, denoise: 0.35 },
      },
      PARAMS,
    );
    expect(graph.hiresEncode?.inputs.pixels).toEqual(['upscaleResize', 0]);
    expect(graph.hiresSampler?.inputs).toMatchObject({
      seed: 7,
      steps: 30,
      denoise: 0.35,
      // Модель с LoRA и те же тексты, что у первого прохода.
      model: ['lora0', 0],
      positive: ['positive', 0],
      latent_image: ['hiresEncode', 0],
    });
    expect(graph.save?.inputs.images).toEqual(['hiresDecode', 0]);
  });

  it('свои шаги второго прохода и размер, округлённый до кратного 8', () => {
    const graph = buildGraph(
      {
        ...STYLE,
        upscale: { model: 'x.pth', scale: 1.3, denoise: 0.3, steps: 15 },
      },
      { ...PARAMS, width: 1000, height: 1000 },
    );
    expect(graph.hiresSampler?.inputs.steps).toBe(15);
    expect(graph.upscaleResize?.inputs).toMatchObject({
      width: 1304,
      height: 1304,
    });
  });
});
