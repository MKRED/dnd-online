import { describe, expect, it } from 'vitest';
import {
  defaultModelFit,
  detectModelFormat,
  isModelFit,
} from './characterModels.js';

function glb(length = 64): Uint8Array {
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  bytes.set([...'glTF'].map((c) => c.charCodeAt(0)));
  view.setUint32(4, 2, true);
  view.setUint32(8, length, true);
  return bytes;
}

function binaryStl(triangles: number, header = ''): Uint8Array {
  const bytes = new Uint8Array(84 + triangles * 50);
  bytes.set([...header].map((c) => c.charCodeAt(0)));
  new DataView(bytes.buffer).setUint32(80, triangles, true);
  return bytes;
}

const text = (value: string) => new TextEncoder().encode(value);

describe('detectModelFormat', () => {
  it('узнаёт .glb по заголовку с длиной файла', () => {
    expect(detectModelFormat(glb())).toBe('glb');
    const wrongLength = glb();
    new DataView(wrongLength.buffer).setUint32(8, 100, true);
    expect(detectModelFormat(wrongLength)).toBeNull();
  });

  it('узнаёт двоичный STL по числу треугольников, даже с «solid» в заголовке', () => {
    expect(detectModelFormat(binaryStl(3))).toBe('stl');
    expect(detectModelFormat(binaryStl(2, 'solid exported'))).toBe('stl');
    expect(detectModelFormat(binaryStl(2).subarray(0, 120))).toBeNull();
  });

  it('узнаёт текстовый STL', () => {
    expect(detectModelFormat(text('solid cube\n facet normal 0 0 1\n'))).toBe(
      'stl',
    );
    expect(detectModelFormat(text('solid but nothing else'))).toBeNull();
  });

  it('не принимает картинку', () => {
    expect(
      detectModelFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])),
    ).toBeNull();
  });
});

describe('isModelFit', () => {
  it('принимает поправку по умолчанию и отказывает выходу за пределы', () => {
    expect(isModelFit(defaultModelFit('stl'))).toBe(true);
    expect(defaultModelFit('glb').up).toBe('y');
    expect(isModelFit({ scale: 5, turn: 0, up: 'y' })).toBe(false);
    expect(isModelFit({ scale: 1, turn: 4, up: 'y' })).toBe(false);
    expect(isModelFit({ scale: 1, turn: 0, up: 'x' })).toBe(false);
    expect(isModelFit({ scale: 1, turn: 0, up: 'y', extra: 1 })).toBe(false);
  });
});
