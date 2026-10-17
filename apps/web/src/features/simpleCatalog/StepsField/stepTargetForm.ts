import type {
  AreaSpec,
  AttackKind,
  StepAreaShape,
  StepTarget,
  StepTargetKind,
} from 'shared';

// Поля цели шага в форме — всех видов сразу, плоско. У области главный размер один на
// все фигуры (длина, сторона, радиус, расстояние), высота — только у цилиндра, ширина —
// только у линии.
export interface TargetValues {
  target: StepTargetKind;
  reachFeet: number | string;
  rangeFeet: number | string;
  longOn: boolean;
  longFeet: number | string;
  areaShape: StepAreaShape;
  areaSize: number | string;
  areaHeight: number | string;
  areaWidth: number | string;
  originKind: 'self' | 'point';
  originFeet: number | string;
}

// «Огненный шар»: сфера радиусом 20 фт. в точке в пределах 150 фт.
export const TARGET_BLANK: Omit<TargetValues, 'target'> = {
  reachFeet: 5,
  rangeFeet: 120,
  longOn: false,
  longFeet: 600,
  areaShape: 'sphere',
  areaSize: 20,
  areaHeight: 40,
  areaWidth: 5,
  originKind: 'point',
  originFeet: 150,
};

function toArea(area: AreaSpec): Partial<TargetValues> {
  switch (area.shape) {
    case 'cone':
      return { areaSize: area.length };
    case 'cube':
      return { areaSize: area.size };
    case 'cylinder':
      return { areaSize: area.radius, areaHeight: area.height };
    case 'emanation':
      return { areaSize: area.distance };
    case 'line':
      return { areaSize: area.length, areaWidth: area.width };
    case 'sphere':
      return { areaSize: area.radius };
  }
}

export function toTargetValues(target: StepTarget): Partial<TargetValues> {
  switch (target.kind) {
    case 'self':
    case 'touch':
      return { target: target.kind };
    case 'reach':
      return { target: 'reach', reachFeet: target.feet };
    case 'range':
      return {
        target: 'range',
        rangeFeet: target.feet,
        longOn: target.longFeet !== null,
        ...(target.longFeet ? { longFeet: target.longFeet } : {}),
      };
    case 'area':
      return {
        target: 'area',
        areaShape: target.area.shape,
        ...toArea(target.area),
        originKind: target.origin.kind,
        ...(target.origin.kind === 'point'
          ? { originFeet: target.origin.feet }
          : {}),
      };
  }
}

function fromArea(values: TargetValues): AreaSpec {
  const size = Number(values.areaSize);
  switch (values.areaShape) {
    case 'cone':
      return { shape: 'cone', length: size };
    case 'cube':
      return { shape: 'cube', size };
    case 'cylinder':
      return {
        shape: 'cylinder',
        radius: size,
        height: Number(values.areaHeight),
      };
    case 'emanation':
      return { shape: 'emanation', distance: size };
    case 'line':
      return { shape: 'line', length: size, width: Number(values.areaWidth) };
    case 'sphere':
      return { shape: 'sphere', radius: size };
  }
}

// Эманация всегда от себя: точку начала у неё не спрашиваем. Дальняя дистанция — только
// у дальнобойного оружия (attack — вид атаки или null без неё): иначе сервер откажет.
export const isPointOrigin = (values: TargetValues) =>
  values.originKind === 'point' && values.areaShape !== 'emanation';

export function fromTargetValues(
  values: TargetValues,
  attack: AttackKind | null,
): StepTarget {
  switch (values.target) {
    case 'self':
    case 'touch':
      return { kind: values.target };
    case 'reach':
      return { kind: 'reach', feet: Number(values.reachFeet) };
    case 'range':
      return {
        kind: 'range',
        feet: Number(values.rangeFeet),
        longFeet:
          values.longOn && attack === 'ranged_weapon'
            ? Number(values.longFeet)
            : null,
      };
    case 'area':
      return {
        kind: 'area',
        area: fromArea(values),
        origin: isPointOrigin(values)
          ? { kind: 'point', feet: Number(values.originFeet) }
          : { kind: 'self' },
      };
  }
}
