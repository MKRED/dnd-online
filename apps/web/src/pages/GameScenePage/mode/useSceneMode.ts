import { useCallback, useState } from 'react';
import { useKeyCodes } from '../../../features/maps/useKeyCodes';

// Режим мастера на странице сцены (docs/plan/scene-page.md, «Два режима мастера»):
// «Игра» — ходы по пути и справка, «Правка» — инструменты редактора и перестановка без
// хода. Это состояние страницы, не сцены: игроки и сервер о нём не знают.
export type SceneMode = 'play' | 'edit';

const MODE_STORAGE_KEY = 'scene.mode';

// Привычка мастера, одна на все игры. Хранилище может быть недоступно (приватный
// режим) — тогда «Игра».
function readMode(): SceneMode {
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'edit' ? 'edit' : 'play';
  } catch (err: unknown) {
    console.error('Failed to read the scene mode', err);
    return 'play';
  }
}

function saveMode(mode: SceneMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch (err: unknown) {
    console.error('Failed to remember the scene mode', err);
  }
}

// У игрока режима нет — всегда «Игра». Клавиша ` (Ё) переключает режим: по коду клавиши,
// от раскладки не зависит; Tab не берём — он нужен для перехода по кнопкам.
// switchable = false (не мастер, «Глазами игроков») — клавиша молчит.
export function useSceneMode(master: boolean, switchable: boolean) {
  const [chosen, setChosen] = useState(readMode);
  const setMode = useCallback((next: SceneMode) => {
    setChosen(next);
    saveMode(next);
  }, []);
  useKeyCodes(
    { Backquote: () => setMode(chosen === 'play' ? 'edit' : 'play') },
    master && switchable,
  );
  return { mode: master ? chosen : ('play' as SceneMode), setMode };
}
