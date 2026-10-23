// Заглушка вместо ndarray, ndarray-pixels и ndarray-lanczos (подменяются в vite.config.ts).
// Их тянет @gltf-transform/functions ради textureCompress/textureResize, которыми мы не
// пользуемся (текстуры жмёт compressTextures.ts). Настоящие пакеты при загрузке собирают
// функции через Function(...), а CSP прода eval не пускает — поток сжатия падал бы сразу.
const unavailable = (): never => {
  throw new Error(
    'ndarray отключён в сборке: используйте compressTextures вместо textureCompress',
  );
};

export const getPixels = unavailable;
export const savePixels = unavailable;
export const lanczos2 = unavailable;
export const lanczos3 = unavailable;
export default unavailable;
