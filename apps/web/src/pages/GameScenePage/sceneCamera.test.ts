import { afterEach, describe, expect, it } from 'vitest';
import { readSceneCamera, saveSceneCamera } from './sceneCamera';

const at = (n: number) => ({
  position: [n, n + 1, n + 2] as [number, number, number],
  target: [0, 0, n] as [number, number, number],
});

describe('sceneCamera', () => {
  afterEach(() => localStorage.clear());

  it('камера сцены читается после сохранения, у другой сцены её нет', () => {
    saveSceneCamera('a', at(1));
    expect(readSceneCamera('a')).toEqual(at(1));
    expect(readSceneCamera('b')).toBeNull();
  });

  it('повторное сохранение заменяет камеру сцены', () => {
    saveSceneCamera('a', at(1));
    saveSceneCamera('a', at(2));
    expect(readSceneCamera('a')).toEqual(at(2));
  });

  it('хранит 20 последних сцен: давно не тронутая вытесняется', () => {
    for (let i = 0; i < 21; i += 1) saveSceneCamera(`s${i}`, at(i));
    expect(readSceneCamera('s0')).toBeNull();
    expect(readSceneCamera('s1')).toEqual(at(1));
    expect(readSceneCamera('s20')).toEqual(at(20));
  });

  it('испорченная запись — камеры нет', () => {
    localStorage.setItem('scene.camera', '{"a":{"position":[1,2]}}');
    expect(readSceneCamera('a')).toBeNull();
    localStorage.setItem('scene.camera', 'не json');
    expect(readSceneCamera('a')).toBeNull();
  });
});
