import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import { Vector3, type Group } from 'three';
import type { Point3 } from 'shared';

const at = new Vector3();

// Поворачивает детей вокруг вертикали лицом (+z) к камере. Billboard из drei с lockX и
// lockZ здесь не годится: он берёт поворот камеры и обнуляет углы x и z, а у камеры,
// смотрящей сверху вниз, разложение углов отдаёт поворот в x и z, и карточка
// оказывалась к ней спиной, то есть пропадала. Угол по положению камеры такой ошибки
// не даёт. Кадры рисуются по запросу, а useFrame идёт перед каждым — лишней работы нет.
function FaceCamera({
  position,
  children,
}: {
  position: Point3;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    const group = ref.current;
    if (!group) return;
    group.getWorldPosition(at);
    group.rotation.y = Math.atan2(
      camera.position.x - at.x,
      camera.position.z - at.z,
    );
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

export default FaceCamera;
