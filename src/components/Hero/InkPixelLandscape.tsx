'use client';

import {
  ParticleMorphCanvas,
  type ParticleMorphAdapter,
  type ParticlePointer,
} from '@/components/ParticleMorph/ParticleMorphCanvas';
import {
  HERO_SCENE_EVENT,
  type HeroScene,
} from './heroScene';

type CloudParticle = {
  x: number;
  y: number;
  size: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  phase: number;
  speed: number;
};

type WaterParticle = {
  x: number;
  y: number;
  width: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  phase: number;
  speed: number;
  amplitude: number;
};

type StaticParticle = {
  x: number;
  y: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

type MorphParticle = StaticParticle & {
  targetX: number;
  targetY: number;
  targetRed: number;
  targetGreen: number;
  targetBlue: number;
  targetAlpha: number;
  delay: number;
  arcX: number;
  arcY: number;
  arcDistance: number;
};

type AboutRevealState = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  maskCanvas: HTMLCanvasElement;
  maskContext: CanvasRenderingContext2D;
  maskImageData: ImageData;
  order: Uint32Array;
  visibleCount: number;
  columns: number;
  rows: number;
  cell: number;
  gridOffsetX: number;
  gridOffsetY: number;
  dpr: number;
};

type MorphLayerState = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  imageData: ImageData;
  columns: number;
  rows: number;
};

type SceneTone = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

const SOURCE_CROP = {
  x: 560,
  y: 105,
  width: 1120,
  height: 820,
} as const;

const ABOUT_SOURCE_CROP = {
  x: 650,
  y: 175,
  width: 850,
  height: 700,
} as const;

const PAPER = {
  red: 249,
  green: 247,
  blue: 240,
} as const;

const LOWER_WASH = {
  destinationStart: 0.72,
  sourceEnd: 1,
} as const;

const MAX_MORPH_PARTICLES = 14000;
const ABOUT_CANVAS_REVEAL_START = 0.5;

const SUN_DISC = {
  x: (1063 - SOURCE_CROP.x) / SOURCE_CROP.width,
  y: (254 - SOURCE_CROP.y) / SOURCE_CROP.height,
  radiusX: 74 / SOURCE_CROP.width,
  radiusY: 74 / SOURCE_CROP.height,
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function colorDistance(red: number, green: number, blue: number) {
  return Math.hypot(
    red - PAPER.red,
    green - PAPER.green,
    blue - PAPER.blue,
  );
}

function pixelColor(
  red: number,
  green: number,
  blue: number,
  alpha: number,
) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function deterministicNoise(column: number, row: number) {
  const value =
    Math.imul(column + 17, 374761393) ^
    Math.imul(row + 29, 668265263);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}

function deepenInkChannel(
  channel: number,
  paperChannel: number,
  gain: number,
) {
  return Math.round(
    clamp(
      paperChannel - (paperChannel - channel) * gain,
      0,
      255,
    ),
  );
}

function sunDiscDistance(
  normalizedX: number,
  normalizedY: number,
) {
  const deltaX =
    (normalizedX - SUN_DISC.x) / SUN_DISC.radiusX;
  const deltaY =
    (normalizedY - SUN_DISC.y) / SUN_DISC.radiusY;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function gaussian(value: number, center: number, width: number) {
  return Math.exp(-Math.pow((value - center) / width, 2));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function power3InOut(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function aboutSceneTone(
  normalizedX: number,
  normalizedY: number,
  column: number,
  row: number,
): SceneTone | null {
  const noise = deterministicNoise(column + 211, row + 223);
  const detailNoise = deterministicNoise(
    column * 13 + 227,
    row * 17 + 229,
  );
  const sunDistance = Math.hypot(
    (normalizedX - 0.43) / 0.065,
    (normalizedY - 0.19) / 0.09,
  );

  if (sunDistance <= 1) {
    return {
      red: 239 + Math.round(noise * 5),
      green: 85 + Math.round(noise * 12),
      blue: 58 + Math.round(noise * 10),
      alpha: 0.94,
    };
  }

  const ribbonY =
    0.19 +
    Math.sin((normalizedX - 0.43) * 16) * 0.055 +
    Math.sin((normalizedX - 0.35) * 7) * 0.018;
  const isTealRibbon =
    normalizedX > 0.36 &&
    normalizedX < 0.82 &&
    Math.abs(normalizedY - ribbonY) < 0.022;

  if (isTealRibbon && noise < 0.82) {
    return {
      red: 43 + Math.round(detailNoise * 26),
      green: 128 + Math.round(detailNoise * 30),
      blue: 132 + Math.round(detailNoise * 26),
      alpha: 0.56 + noise * 0.28,
    };
  }

  let tone: SceneTone | null = null;
  const mountainTop = Math.min(
    0.68 - gaussian(normalizedX, 0.27, 0.1) * 0.29,
    0.7 - gaussian(normalizedX, 0.47, 0.105) * 0.36,
    0.72 - gaussian(normalizedX, 0.62, 0.13) * 0.25,
  );
  const isMountain =
    normalizedX > 0.1 &&
    normalizedX < 0.8 &&
    normalizedY > mountainTop &&
    normalizedY < 0.91;

  if (isMountain) {
    const mountainDepth = clamp(
      (normalizedY - mountainTop) / 0.28,
      0,
      1,
    );
    const density = 0.28 + mountainDepth * 0.42;

    if (noise < density) {
      const ink = Math.round(
        190 -
          mountainDepth * 62 +
          detailNoise * 32,
      );
      tone = {
        red: ink + 4,
        green: ink + 3,
        blue: ink,
        alpha: 0.34 + mountainDepth * 0.38,
      };
    }
  }

  const roofPosition = Math.abs(
    (normalizedX - 0.79) / 0.25,
  );
  const roofTop =
    0.375 +
    roofPosition * 0.095 -
    Math.pow(clamp(roofPosition, 0, 1), 6) * 0.032;
  const roofBottom = 0.47 + roofPosition * 0.045;
  const isRoof =
    roofPosition < 1.08 &&
    normalizedY >= roofTop &&
    normalizedY <= roofBottom;

  if (isRoof && noise < 0.94) {
    const tileBand =
      Math.sin(column * 0.9 + row * 0.45) * 10;
    return {
      red: Math.round(34 + detailNoise * 34 + tileBand),
      green: Math.round(43 + detailNoise * 33 + tileBand),
      blue: Math.round(43 + detailNoise * 28 + tileBand),
      alpha: 0.76 + noise * 0.22,
    };
  }

  const isWall =
    normalizedX > 0.585 &&
    normalizedX < 1 &&
    normalizedY > 0.475 &&
    normalizedY < 0.825;

  if (isWall && noise < 0.76) {
    tone = {
      red: 216 + Math.round(detailNoise * 24),
      green: 198 + Math.round(detailNoise * 24),
      blue: 170 + Math.round(detailNoise * 22),
      alpha: 0.46 + noise * 0.36,
    };
  }

  const isWindow =
    normalizedX > 0.66 &&
    normalizedX < 0.925 &&
    normalizedY > 0.53 &&
    normalizedY < 0.755;

  if (isWindow && noise < 0.88) {
    tone = {
      red: 234 + Math.round(detailNoise * 14),
      green: 207 + Math.round(detailNoise * 20),
      blue: 161 + Math.round(detailNoise * 20),
      alpha: 0.58 + noise * 0.32,
    };
  }

  const beamColumns = [0.605, 0.655, 0.72, 0.805, 0.905, 0.975];
  const isVerticalBeam =
    isWall &&
    beamColumns.some(
      (beamX) => Math.abs(normalizedX - beamX) < 0.006,
    );
  const isHorizontalBeam =
    normalizedX > 0.585 &&
    normalizedX < 1 &&
    ([0.505, 0.545, 0.665, 0.765, 0.805] as const).some(
      (beamY) => Math.abs(normalizedY - beamY) < 0.006,
    );

  if ((isVerticalBeam || isHorizontalBeam) && noise < 0.96) {
    return {
      red: 31 + Math.round(detailNoise * 22),
      green: 42 + Math.round(detailNoise * 20),
      blue: 42 + Math.round(detailNoise * 19),
      alpha: 0.82 + noise * 0.16,
    };
  }

  const isPosterFrame =
    normalizedY > 0.565 &&
    normalizedY < 0.665 &&
    ((normalizedX > 0.865 &&
      normalizedX < 0.91 &&
      (Math.abs(normalizedX - 0.865) < 0.004 ||
        Math.abs(normalizedX - 0.91) < 0.004 ||
        Math.abs(normalizedY - 0.565) < 0.005 ||
        Math.abs(normalizedY - 0.665) < 0.005)) ||
      (normalizedX > 0.925 &&
        normalizedX < 0.972 &&
        (Math.abs(normalizedX - 0.925) < 0.004 ||
          Math.abs(normalizedX - 0.972) < 0.004 ||
          Math.abs(normalizedY - 0.565) < 0.005 ||
          Math.abs(normalizedY - 0.665) < 0.005)));

  if (isPosterFrame) {
    return {
      red: 67,
      green: 61,
      blue: 51,
      alpha: 0.76,
    };
  }

  const lampStem =
    Math.abs(normalizedX - 0.77) < 0.004 &&
    normalizedY > 0.505 &&
    normalizedY < 0.585;
  const lampShade =
    normalizedY > 0.57 &&
    normalizedY < 0.59 &&
    Math.abs(normalizedX - 0.77) <
      (normalizedY - 0.565) * 0.9;

  if (lampStem || lampShade) {
    return {
      red: 34,
      green: 40,
      blue: 38,
      alpha: 0.95,
    };
  }

  const personHead = Math.hypot(
    (normalizedX - 0.79) / 0.018,
    (normalizedY - 0.65) / 0.024,
  );
  const personBody =
    Math.pow((normalizedX - 0.8) / 0.036, 2) +
      Math.pow((normalizedY - 0.705) / 0.065, 2) <
    1;

  if (personHead < 1) {
    const isHair =
      normalizedY < 0.647 ||
      normalizedX < 0.785;

    return isHair
      ? {
          red: 25 + Math.round(detailNoise * 20),
          green: 32 + Math.round(detailNoise * 19),
          blue: 34 + Math.round(detailNoise * 18),
          alpha: 0.92,
        }
      : {
          red: 171 + Math.round(detailNoise * 28),
          green: 119 + Math.round(detailNoise * 24),
          blue: 82 + Math.round(detailNoise * 18),
          alpha: 0.88,
        };
  }

  if (personBody && noise < 0.82) {
    return {
      red: 24 + Math.round(detailNoise * 30),
      green: 42 + Math.round(detailNoise * 38),
      blue: 53 + Math.round(detailNoise * 44),
      alpha: 0.82 + noise * 0.14,
    };
  }

  const armProgress = clamp(
    (normalizedX - 0.795) / 0.09,
    0,
    1,
  );
  const armY = 0.68 + armProgress * 0.048;
  const isArm =
    normalizedX > 0.795 &&
    normalizedX < 0.885 &&
    Math.abs(normalizedY - armY) < 0.006;

  if (isArm && noise < 0.9) {
    return {
      red: 35,
      green: 54,
      blue: 65,
      alpha: 0.9,
    };
  }

  const bonsaiTrunk =
    Math.abs(normalizedX - 0.65) < 0.004 &&
    normalizedY > 0.635 &&
    normalizedY < 0.725;
  const bonsaiCrown =
    Math.pow((normalizedX - 0.65) / 0.034, 2) +
      Math.pow((normalizedY - 0.63) / 0.028, 2) <
    1;
  const bonsaiPot =
    normalizedX > 0.632 &&
    normalizedX < 0.668 &&
    normalizedY > 0.71 &&
    normalizedY < 0.73;

  if (
    (bonsaiTrunk || bonsaiCrown || bonsaiPot) &&
    noise < 0.72
  ) {
    return {
      red: 49 + Math.round(detailNoise * 26),
      green: 63 + Math.round(detailNoise * 34),
      blue: 48 + Math.round(detailNoise * 24),
      alpha: 0.72 + noise * 0.2,
    };
  }

  const laptopScreen =
    normalizedX > 0.705 &&
    normalizedX < 0.755 &&
    normalizedY > 0.68 &&
    normalizedY < 0.72 &&
    normalizedY >
      0.68 + (normalizedX - 0.705) * 0.18;
  const laptopBase =
    normalizedX > 0.7 &&
    normalizedX < 0.77 &&
    Math.abs(normalizedY - 0.724) < 0.005;

  if (laptopScreen || laptopBase) {
    return {
      red: 29,
      green: 69 + Math.round(detailNoise * 28),
      blue: 76 + Math.round(detailNoise * 31),
      alpha: 0.9,
    };
  }

  const isDesk =
    normalizedX > 0.7 &&
    normalizedX < 0.94 &&
    Math.abs(normalizedY - 0.735) < 0.008;
  const isShelf =
    normalizedX > 0.93 &&
    normalizedX < 0.985 &&
    normalizedY > 0.585 &&
    normalizedY < 0.76 &&
    (Math.abs((normalizedY * 100) % 4) < 0.8 ||
      Math.abs(normalizedX - 0.945) < 0.005);

  if ((isDesk || isShelf) && noise < 0.95) {
    return {
      red: 45 + Math.round(detailNoise * 28),
      green: 48 + Math.round(detailNoise * 24),
      blue: 43 + Math.round(detailNoise * 21),
      alpha: 0.9,
    };
  }

  const foregroundTop =
    0.89 -
    gaussian(normalizedX, 0.78, 0.26) * 0.09 -
    gaussian(normalizedX, 0.96, 0.12) * 0.07;
  const isForeground =
    normalizedX > 0.46 && normalizedY > foregroundTop;

  if (isForeground && noise < 0.78) {
    const depth = clamp(
      (normalizedY - foregroundTop) / 0.16,
      0,
      1,
    );
    return {
      red: Math.round(47 - depth * 24 + detailNoise * 34),
      green: Math.round(58 - depth * 25 + detailNoise * 38),
      blue: Math.round(58 - depth * 21 + detailNoise * 36),
      alpha: 0.6 + depth * 0.34,
    };
  }

  const isLowerTeal =
    normalizedY > 0.88 &&
    normalizedX > 0.42 &&
    Math.abs(
      normalizedY -
        (0.94 + Math.sin(column * 0.09) * 0.025),
    ) < 0.012;

  if (isLowerTeal && noise < 0.62) {
    return {
      red: 34,
      green: 125 + Math.round(detailNoise * 28),
      blue: 131 + Math.round(detailNoise * 28),
      alpha: 0.48 + noise * 0.34,
    };
  }

  return tone;
}

function officeSceneTone(
  normalizedX: number,
  normalizedY: number,
  column: number,
  row: number,
): SceneTone | null {
  const noise = deterministicNoise(column + 307, row + 311);
  const detail = deterministicNoise(
    column * 19 + 313,
    row * 23 + 317,
  );
  const dark = {
    red: 35 + Math.round(detail * 28),
    green: 43 + Math.round(detail * 26),
    blue: 43 + Math.round(detail * 24),
    alpha: 0.82 + noise * 0.14,
  };
  const wallGrid =
    normalizedX > 0.32 &&
    normalizedY > 0.27 &&
    normalizedY < 0.82 &&
    (column % 12 === 0 || row % 12 === 0);

  if (wallGrid && noise < 0.42) {
    return {
      red: 183,
      green: 181,
      blue: 172,
      alpha: 0.16,
    };
  }

  const desk =
    normalizedX > 0.42 &&
    normalizedX < 0.92 &&
    Math.abs(normalizedY - 0.72) < 0.01;
  const deskLeg =
    normalizedY > 0.72 &&
    normalizedY < 0.87 &&
    (Math.abs(normalizedX - 0.45) < 0.006 ||
      Math.abs(normalizedX - 0.88) < 0.006);

  if (desk || deskLeg) return dark;

  const monitorFrame =
    normalizedX > 0.66 &&
    normalizedX < 0.79 &&
    normalizedY > 0.51 &&
    normalizedY < 0.66;
  const monitorInner =
    normalizedX > 0.673 &&
    normalizedX < 0.777 &&
    normalizedY > 0.525 &&
    normalizedY < 0.638;

  if (monitorFrame) {
    if (monitorInner && noise < 0.88) {
      return {
        red: 195 + Math.round(detail * 28),
        green: 197 + Math.round(detail * 25),
        blue: 187 + Math.round(detail * 22),
        alpha: 0.66,
      };
    }
    return dark;
  }

  const monitorStand =
    (Math.abs(normalizedX - 0.725) < 0.006 &&
      normalizedY > 0.65 &&
      normalizedY < 0.71) ||
    (normalizedX > 0.69 &&
      normalizedX < 0.76 &&
      Math.abs(normalizedY - 0.7) < 0.006);

  if (monitorStand) return dark;

  const head = Math.hypot(
    (normalizedX - 0.605) / 0.03,
    (normalizedY - 0.55) / 0.038,
  );
  const torso =
    Math.pow((normalizedX - 0.615) / 0.066, 2) +
      Math.pow((normalizedY - 0.65) / 0.1, 2) <
    1;
  const chair =
    (Math.pow((normalizedX - 0.57) / 0.055, 2) +
      Math.pow((normalizedY - 0.69) / 0.09, 2) <
      1) ||
    (Math.abs(normalizedX - 0.56) < 0.008 &&
      normalizedY > 0.7 &&
      normalizedY < 0.86);

  if ((head < 1 || torso || chair) && noise < 0.9) {
    return {
      red: 29 + Math.round(detail * 30),
      green: 40 + Math.round(detail * 34),
      blue: 43 + Math.round(detail * 38),
      alpha: 0.82 + noise * 0.16,
    };
  }

  const armProgress = clamp(
    (normalizedX - 0.625) / 0.11,
    0,
    1,
  );
  const armY = 0.63 + armProgress * 0.07;

  if (
    normalizedX > 0.625 &&
    normalizedX < 0.75 &&
    Math.abs(normalizedY - armY) < 0.008
  ) {
    return dark;
  }

  const plantPot =
    normalizedX > 0.345 &&
    normalizedX < 0.405 &&
    normalizedY > 0.72 &&
    normalizedY < 0.8;
  const plantStem =
    Math.abs(normalizedX - 0.375) < 0.005 &&
    normalizedY > 0.54 &&
    normalizedY < 0.73;
  const leaf =
    normalizedY > 0.53 &&
    normalizedY < 0.7 &&
    (Math.abs(
      normalizedX -
        (0.375 +
          Math.sin(normalizedY * 82) * 0.045),
    ) < 0.012 ||
      Math.abs(
        normalizedX -
          (0.375 -
            Math.sin(normalizedY * 76) * 0.042),
      ) < 0.012);

  if ((plantPot || plantStem || leaf) && noise < 0.78) {
    return {
      red: 60 + Math.round(detail * 28),
      green: 88 + Math.round(detail * 32),
      blue: 71 + Math.round(detail * 25),
      alpha: 0.68 + noise * 0.24,
    };
  }

  const shelf =
    normalizedX > 0.8 &&
    normalizedX < 0.96 &&
    Math.abs(normalizedY - 0.43) < 0.008;
  const books =
    normalizedX > 0.81 &&
    normalizedX < 0.87 &&
    normalizedY > 0.34 &&
    normalizedY < 0.43 &&
    column % 5 < 3;
  const shelfPlant =
    Math.pow((normalizedX - 0.91) / 0.04, 2) +
      Math.pow((normalizedY - 0.39) / 0.05, 2) <
    1;

  if (shelf || books) return dark;
  if (shelfPlant && noise < 0.68) {
    return {
      red: 55,
      green: 83 + Math.round(detail * 28),
      blue: 65,
      alpha: 0.72,
    };
  }

  const codePanel =
    normalizedX > 0.42 &&
    normalizedX < 0.54 &&
    normalizedY > 0.36 &&
    normalizedY < 0.49;
  const artFrame =
    normalizedX > 0.58 &&
    normalizedX < 0.65 &&
    normalizedY > 0.38 &&
    normalizedY < 0.51;

  if ((codePanel || artFrame) && noise < 0.78) {
    const isBorder =
      column % 22 < 2 ||
      row % 26 < 2;
    return isBorder
      ? dark
      : {
          red: 171 + Math.round(detail * 30),
          green: 170 + Math.round(detail * 28),
          blue: 162 + Math.round(detail * 25),
          alpha: 0.48,
        };
  }

  const booksOnDesk =
    normalizedX > 0.79 &&
    normalizedX < 0.87 &&
    normalizedY > 0.675 &&
    normalizedY < 0.72 &&
    row % 4 < 2;

  if (booksOnDesk) return dark;

  const floorShadow =
    normalizedY > 0.84 &&
    normalizedX > 0.3 &&
    normalizedX < 0.98 &&
    noise <
      0.18 +
        gaussian(normalizedX, 0.64, 0.27) * 0.42;

  if (floorShadow) {
    return {
      red: 112 + Math.round(detail * 45),
      green: 113 + Math.round(detail * 43),
      blue: 106 + Math.round(detail * 38),
      alpha: 0.26 + noise * 0.3,
    };
  }

  const ambientDust =
    normalizedX > 0.28 &&
    normalizedY > 0.3 &&
    normalizedY < 0.88 &&
    noise < 0.035;

  if (ambientDust) {
    return {
      red: 132,
      green: 137,
      blue: 132,
      alpha: 0.32,
    };
  }

  return null;
}

function buildAboutScene(
  width: number,
  height: number,
  dpr: number,
  cell: number,
  gridOffsetX: number,
  gridOffsetY: number,
  columns: number,
  rows: number,
  landscapeParticles: StaticParticle[],
  aboutSource: HTMLImageElement | null,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const context = canvas.getContext('2d');

  if (!context || landscapeParticles.length === 0) {
    return {
      canvas,
      particles: [] as MorphParticle[],
      reveal: null as AboutRevealState | null,
      morphLayer: null as MorphLayerState | null,
    };
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  const sampleContext = sampleCanvas.getContext('2d', {
    willReadFrequently: true,
  });
  let sampledPixels: Uint8ClampedArray | null = null;

  if (aboutSource && sampleContext) {
    const destinationTop = Math.round(rows * 0.1);
    sampleContext.imageSmoothingEnabled = true;
    sampleContext.drawImage(
      aboutSource,
      ABOUT_SOURCE_CROP.x,
      ABOUT_SOURCE_CROP.y,
      ABOUT_SOURCE_CROP.width,
      ABOUT_SOURCE_CROP.height,
      0,
      destinationTop,
      columns,
      Math.round(rows * 0.84),
    );
    sampledPixels = sampleContext.getImageData(
      0,
      0,
      columns,
      rows,
    ).data;
  }

  const cinnabarOrigins = landscapeParticles.filter(
    (particle) =>
      particle.red > particle.green * 1.5 &&
      particle.red > particle.blue * 1.45,
  );
  const particles: MorphParticle[] = [];
  const revealTargets: {
    pixelIndex: number;
    order: number;
  }[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const normalizedX = column / columns;
      const normalizedY = row / rows;
      let tone: SceneTone | null = null;

      if (sampledPixels) {
        const index = (row * columns + column) * 4;
        const red = sampledPixels[index];
        const green = sampledPixels[index + 1];
        const blue = sampledPixels[index + 2];
        const sourceAlpha = sampledPixels[index + 3] / 255;
        const distance = Math.hypot(
          red - 247,
          green - 241,
          blue - 232,
        );
        const luminance =
          red * 0.2126 +
          green * 0.7152 +
          blue * 0.0722;
        const chroma =
          Math.max(red, green, blue) -
          Math.min(red, green, blue);

        if (
          sourceAlpha > 0.2 &&
          distance > 13 &&
          (luminance < 232 || chroma > 15)
        ) {
          const gain =
            luminance < 150
              ? 1.12
              : luminance < 205
                ? 1.05
                : 1;
          tone = {
            red: deepenInkChannel(red, 247, gain),
            green: deepenInkChannel(green, 241, gain),
            blue: deepenInkChannel(blue, 232, gain),
            alpha: clamp(
              0.28 + (238 - luminance) / 102,
              0.22,
              0.96,
            ),
          };
        }
      } else {
        const atmosphere = aboutSceneTone(
          normalizedX,
          normalizedY,
          column,
          row,
        );
        const isAtmosphere =
          atmosphere &&
          (atmosphere.red > atmosphere.green * 1.5 ||
            (atmosphere.green > atmosphere.red * 1.55 &&
              atmosphere.blue > atmosphere.red * 1.55));
        tone =
          officeSceneTone(
            normalizedX,
            normalizedY,
            column,
            row,
          ) ?? (isAtmosphere ? atmosphere : null);
      }

      if (!tone) continue;

      const targetX = gridOffsetX + column * cell + 1;
      const targetY = gridOffsetY + row * cell + 1;
      const isCinnabarTarget =
        tone.red > tone.green * 1.5 &&
        tone.red > tone.blue * 1.45;
      const originPool =
        isCinnabarTarget && cinnabarOrigins.length > 0
          ? cinnabarOrigins
          : landscapeParticles;
      const originNoise = deterministicNoise(
        column * 31 + 233,
        row * 37 + 239,
      );
      const origin =
        originPool[
          Math.floor(originNoise * originPool.length) %
            originPool.length
        ];

      context.fillStyle = pixelColor(
        tone.red,
        tone.green,
        tone.blue,
        tone.alpha,
      );
      context.fillRect(
        targetX,
        targetY,
        cell - 1,
        cell - 1,
      );

      const clusterNoise = deterministicNoise(
        Math.floor(column / 3) + 269,
        Math.floor(row / 3) + 271,
      );
      const fineNoise = deterministicNoise(
        column * 59 + 277,
        row * 61 + 281,
      );
      const distanceFromFocus = clamp(
        Math.hypot(
          (normalizedX - 0.58) * 0.72,
          (normalizedY - 0.64) * 0.58,
        ),
        0,
        1,
      );
      revealTargets.push({
        pixelIndex: row * columns + column,
        order:
          clusterNoise * 0.56 +
          fineNoise * 0.2 +
          distanceFromFocus * 0.24,
      });

      const phase =
        deterministicNoise(
          column * 41 + 257,
          row * 43 + 263,
        ) *
        Math.PI *
        2;

      particles.push({
        ...origin,
        targetX,
        targetY,
        targetRed: tone.red,
        targetGreen: tone.green,
        targetBlue: tone.blue,
        targetAlpha: tone.alpha,
        delay:
          deterministicNoise(column + 241, row + 251) * 0.34,
        arcX: Math.cos(phase),
        arcY: Math.sin(phase) * 0.7,
        arcDistance:
          40 + (phase / (Math.PI * 2)) * 100,
      });
    }
  }

  revealTargets.sort(
    (first, second) => first.order - second.order,
  );

  const revealCanvas = document.createElement('canvas');
  revealCanvas.width = canvas.width;
  revealCanvas.height = canvas.height;
  const revealContext = revealCanvas.getContext('2d');
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = columns;
  maskCanvas.height = rows;
  const maskContext = maskCanvas.getContext('2d');
  let reveal: AboutRevealState | null = null;

  if (revealContext && maskContext) {
    const maskImageData = maskContext.createImageData(
      columns,
      rows,
    );

    for (const target of revealTargets) {
      const dataIndex = target.pixelIndex * 4;
      maskImageData.data[dataIndex] = 255;
      maskImageData.data[dataIndex + 1] = 255;
      maskImageData.data[dataIndex + 2] = 255;
    }

    reveal = {
      canvas: revealCanvas,
      context: revealContext,
      maskCanvas,
      maskContext,
      maskImageData,
      order: Uint32Array.from(
        revealTargets,
        (target) => target.pixelIndex,
      ),
      visibleCount: 0,
      columns,
      rows,
      cell,
      gridOffsetX,
      gridOffsetY,
      dpr,
    };
  }

  const morphCanvas = document.createElement('canvas');
  morphCanvas.width = columns;
  morphCanvas.height = rows;
  const morphContext = morphCanvas.getContext('2d');
  const morphLayer: MorphLayerState | null = morphContext
    ? {
        canvas: morphCanvas,
        context: morphContext,
        imageData: morphContext.createImageData(
          columns,
          rows,
        ),
        columns,
        rows,
      }
    : null;

  const animatedParticles =
    particles.length <= MAX_MORPH_PARTICLES
      ? particles
      : Array.from(
          { length: MAX_MORPH_PARTICLES },
          (_, index) =>
            particles[
              Math.floor(
                (index * particles.length) /
                  MAX_MORPH_PARTICLES,
              )
            ],
        );

  return {
    canvas,
    particles: animatedParticles,
    reveal,
    morphLayer,
  };
}

function lakeSurfaceAt(column: number, columns: number) {
  const normalizedX = column / columns;

  return (
    0.785 +
    Math.sin(column * 0.045) * 0.022 +
    Math.sin(column * 0.017 + 1.2) * 0.011 -
    clamp((normalizedX - 0.72) / 0.28, 0, 1) * 0.012
  );
}

function buildPixelField(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement,
  aboutSource: HTMLImageElement | null,
  width: number,
  height: number,
  originX: number,
  originY: number,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Two art cells live inside one 8px project grid cell. This keeps the
  // landscape registered to the global grid without sacrificing detail.
  const cell = 4;
  const gridOffsetX =
    (cell - (((originX % cell) + cell) % cell)) % cell;
  const gridOffsetY =
    (cell - (((originY % cell) + cell) % cell)) % cell;
  const columns = Math.ceil((width - gridOffsetX) / cell);
  const rows = Math.ceil((height - gridOffsetY) / cell);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  const sampleContext = sampleCanvas.getContext('2d', {
    willReadFrequently: true,
  });

  if (!sampleContext) {
    return null;
  }

  sampleContext.imageSmoothingEnabled = true;
  const upperRows = Math.round(rows * LOWER_WASH.destinationStart);
  const upperSourceHeight =
    SOURCE_CROP.height * LOWER_WASH.destinationStart;

  sampleContext.drawImage(
    source,
    SOURCE_CROP.x,
    SOURCE_CROP.y,
    SOURCE_CROP.width,
    upperSourceHeight,
    0,
    0,
    columns,
    upperRows,
  );
  sampleContext.drawImage(
    source,
    SOURCE_CROP.x,
    SOURCE_CROP.y + upperSourceHeight,
    SOURCE_CROP.width,
    SOURCE_CROP.height *
      (LOWER_WASH.sourceEnd - LOWER_WASH.destinationStart),
    0,
    upperRows,
    columns,
    rows - upperRows,
  );

  const sourcePixels = sampleContext.getImageData(
    0,
    0,
    columns,
    rows,
  ).data;

  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = canvas.width;
  staticCanvas.height = canvas.height;
  const staticContext = staticCanvas.getContext('2d');

  if (!staticContext) {
    return null;
  }

  staticContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  staticContext.imageSmoothingEnabled = false;

  const cloudParticles: CloudParticle[] = [];
  const waterParticles: WaterParticle[] = [];
  const landscapeParticles: StaticParticle[] = [];
  const paintStaticParticle = (
    x: number,
    y: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ) => {
    staticContext.fillStyle = pixelColor(
      red,
      green,
      blue,
      alpha,
    );
    staticContext.fillRect(x, y, cell - 1, cell - 1);
    landscapeParticles.push({
      x,
      y,
      red,
      green,
      blue,
      alpha,
    });
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns + column) * 4;
      const red = sourcePixels[index];
      const green = sourcePixels[index + 1];
      const blue = sourcePixels[index + 2];
      const sourceAlpha = sourcePixels[index + 3] / 255;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      const distance = colorDistance(red, green, blue);
      const normalizedX = column / columns;
      const normalizedY = row / rows;
      const isCinnabar =
        red > 150 && red > green * 1.23 && red > blue * 1.18;
      const sunDistance = sunDiscDistance(
        normalizedX,
        normalizedY,
      );
      const isSunDisc = sunDistance <= 1;
      const isTextClearZone =
        normalizedX < 0.285 &&
        normalizedY > 0.3 &&
        normalizedY < 0.52;
      const lowerForegroundDepth =
        clamp((normalizedX - 0.3) / 0.62, 0, 1) *
        clamp((normalizedY - 0.4) / 0.46, 0, 1);
      const rightPeakDepth =
        clamp((normalizedX - 0.62) / 0.28, 0, 1) *
        clamp((normalizedY - 0.14) / 0.2, 0, 1) *
        clamp((0.78 - normalizedY) / 0.22, 0, 1);
      const sceneDepth = clamp(
        Math.max(lowerForegroundDepth, rightPeakDepth * 0.68),
        0,
        1,
      );

      const isReferenceCrosshair =
        normalizedX > 0.705 &&
        normalizedX < 0.77 &&
        normalizedY > 0.895;
      const isReferenceHintLabel =
        normalizedX > 0.77 &&
        normalizedX < 0.97 &&
        normalizedY > 0.918 &&
        normalizedY < 0.955;
      const isReferenceHint =
        isReferenceCrosshair || isReferenceHintLabel;
      const lowerWashBlend =
        clamp((normalizedX - 0.5) / 0.22, 0, 1) *
        clamp((normalizedY - 0.52) / 0.2, 0, 1);
      const minimumInkDistance =
        22 - lowerWashBlend * 11;
      const maximumWashLuminance =
        234 + lowerWashBlend * 8;
      const isSourceVisible =
        !isReferenceHint &&
        !isTextClearZone &&
        sourceAlpha > 0.2 &&
        (isSunDisc ||
          (distance > minimumInkDistance &&
            (luminance < maximumWashLuminance ||
              chroma > 17)));
      let isInkWashBridge = false;
      let bridgeRed: number = PAPER.red;
      let bridgeGreen: number = PAPER.green;
      let bridgeBlue: number = PAPER.blue;
      let bridgeAlpha = 0;

      if (
        !isSourceVisible &&
        !isReferenceHint &&
        sourceAlpha > 0.2 &&
        normalizedX > 0.58 &&
        normalizedY > 0.6
      ) {
        let inkWeight = 0;
        let upperInkWeight = 0;
        let leftInkWeight = 0;
        let rightInkWeight = 0;
        let weightedRed = 0;
        let weightedGreen = 0;
        let weightedBlue = 0;

        for (let offsetRow = -7; offsetRow <= 4; offsetRow += 1) {
          const neighborRow = row + offsetRow;
          if (neighborRow < 0 || neighborRow >= rows) continue;

          for (
            let offsetColumn = -7;
            offsetColumn <= 7;
            offsetColumn += 1
          ) {
            if (offsetColumn === 0 && offsetRow === 0) continue;

            const neighborColumn = column + offsetColumn;
            if (
              neighborColumn < 0 ||
              neighborColumn >= columns
            ) {
              continue;
            }

            const neighborIndex =
              (neighborRow * columns + neighborColumn) * 4;
            const neighborRed = sourcePixels[neighborIndex];
            const neighborGreen =
              sourcePixels[neighborIndex + 1];
            const neighborBlue =
              sourcePixels[neighborIndex + 2];
            const neighborLuminance =
              neighborRed * 0.2126 +
              neighborGreen * 0.7152 +
              neighborBlue * 0.0722;
            const neighborDistance = colorDistance(
              neighborRed,
              neighborGreen,
              neighborBlue,
            );
            const neighborIsCinnabar =
              neighborRed > 150 &&
              neighborRed > neighborGreen * 1.23 &&
              neighborRed > neighborBlue * 1.18;

            if (
              neighborIsCinnabar ||
              neighborDistance < 22 ||
              neighborLuminance > 218
            ) {
              continue;
            }

            const weight =
              1 /
              (1.5 +
                Math.abs(offsetColumn) +
                Math.abs(offsetRow));
            inkWeight += weight;
            weightedRed += neighborRed * weight;
            weightedGreen += neighborGreen * weight;
            weightedBlue += neighborBlue * weight;

            if (offsetRow < 0) upperInkWeight += weight;
            if (offsetColumn < 0) leftInkWeight += weight;
            if (offsetColumn > 0) rightInkWeight += weight;
          }
        }

        const hasOpposingInk =
          leftInkWeight > 0.5 && rightInkWeight > 0.5;
        const hangsBelowInk =
          upperInkWeight > 1.15 &&
          (leftInkWeight > 0.34 || rightInkWeight > 0.34);
        const rightSlopeBoost = clamp(
          (normalizedX - 0.76) / 0.2,
          0,
          1,
        );
        const bridgeProbability =
          clamp(
            ((inkWeight - 1.55) / 4.35) *
              (1 + rightSlopeBoost * 0.42),
            0,
            0.86,
          ) * clamp((normalizedY - 0.58) / 0.18, 0, 1);
        const bridgeNoise = deterministicNoise(
          column * 29 + 127,
          row * 31 + 131,
        );

        if (
          inkWeight > 0 &&
          (hasOpposingInk || hangsBelowInk) &&
          bridgeNoise < bridgeProbability
        ) {
          const averageRed = weightedRed / inkWeight;
          const averageGreen = weightedGreen / inkWeight;
          const averageBlue = weightedBlue / inkWeight;
          const paperBlend =
            0.22 +
            deterministicNoise(column + 137, row + 139) *
              0.16 -
            rightSlopeBoost * 0.05;

          bridgeRed = Math.round(
            averageRed * (1 - paperBlend) +
              PAPER.red * paperBlend,
          );
          bridgeGreen = Math.round(
            averageGreen * (1 - paperBlend) +
              PAPER.green * paperBlend,
          );
          bridgeBlue = Math.round(
            averageBlue * (1 - paperBlend) +
              PAPER.blue * paperBlend,
          );
          bridgeAlpha =
            0.28 +
            clamp(inkWeight / 7, 0, 1) * 0.22 +
            rightSlopeBoost * 0.05;
          isInkWashBridge = true;
        }
      }

      const isVisible = isSourceVisible || isInkWashBridge;

      if (!isVisible) continue;

      const isFlowingMist =
        !isCinnabar &&
        normalizedY > 0.13 &&
        normalizedY < 0.63 &&
        normalizedX > 0.04 &&
        luminance > 164 &&
        Math.abs(green - blue) < 34;

      const contrastAlpha = clamp(
        0.22 + (244 - luminance) / 88,
        0.24,
        0.96,
      );
      const alpha = contrastAlpha * sourceAlpha;
      const x = gridOffsetX + column * cell + 1;
      const y = gridOffsetY + row * cell + 1;

      if (isSunDisc) {
        const sunTone = deterministicNoise(
          column + 157,
          row + 163,
        );
        const edgeLift = clamp(
          (sunDistance - 0.58) / 0.42,
          0,
          1,
        );
        paintStaticParticle(
          x,
          y,
          236 +
            Math.round(sunTone * 5) +
            Math.round(edgeLift * 3),
          92 +
            Math.round(sunTone * 8) +
            Math.round(edgeLift * 10),
          68 +
            Math.round(sunTone * 7) +
            Math.round(edgeLift * 9),
          0.94,
        );
        continue;
      }

      if (isInkWashBridge) {
        const bridgeGain = 1 + sceneDepth * 0.34;
        paintStaticParticle(
          x,
          y,
          deepenInkChannel(bridgeRed, PAPER.red, bridgeGain),
          deepenInkChannel(
            bridgeGreen,
            PAPER.green,
            bridgeGain,
          ),
          deepenInkChannel(
            bridgeBlue,
            PAPER.blue,
            bridgeGain,
          ),
          clamp(bridgeAlpha * (1 + sceneDepth * 0.1), 0, 1),
        );
        continue;
      }

      if (isFlowingMist) {
        const animates =
          deterministicNoise(
            column * 47 + 181,
            row * 53 + 191,
          ) < 0.2;

        paintStaticParticle(
          x,
          y,
          red,
          green,
          blue,
          Math.min(alpha * (animates ? 0.28 : 0.68), 0.42),
        );

        if (animates) {
          cloudParticles.push({
            x,
            y,
            size: cell - 1,
            red,
            green,
            blue,
            alpha: Math.min(alpha * 0.78, 0.5),
            phase: column * 0.073 + row * 0.119,
            speed:
              0.28 +
              ((column * 17 + row * 13) % 19) / 70,
          });
        }
        continue;
      }

      const sourceInkStrength = clamp(
        (224 - luminance) / 150,
        0,
        1,
      );
      const toneNoise = deterministicNoise(
        column + 149,
        row + 151,
      );
      const inkGain = clamp(
        1.04 +
          sourceInkStrength * 0.08 +
          sceneDepth *
            sourceInkStrength *
            (0.34 + toneNoise * 0.12),
        1,
        1.48,
      );
      const adjustedRed = isCinnabar
        ? red
        : deepenInkChannel(red, PAPER.red, inkGain);
      const adjustedGreen = isCinnabar
        ? green
        : deepenInkChannel(green, PAPER.green, inkGain);
      const adjustedBlue = isCinnabar
        ? blue
        : deepenInkChannel(blue, PAPER.blue, inkGain);
      const adjustedAlpha = isCinnabar
        ? alpha
        : clamp(
            alpha *
              (1 + sceneDepth * sourceInkStrength * 0.08),
            0,
            1,
          );

      paintStaticParticle(
        x,
        y,
        adjustedRed,
        adjustedGreen,
        adjustedBlue,
        adjustedAlpha,
      );
    }
  }

  const lakeStartRow = Math.floor(rows * 0.745);
  const lakeStartColumn = Math.floor(columns * 0.38);

  for (let row = lakeStartRow; row < rows; row += 1) {
    const normalizedY = row / rows;

    for (
      let column = lakeStartColumn;
      column < columns;
      column += 1
    ) {
      const normalizedX = column / columns;
      const lakeSurface = lakeSurfaceAt(column, columns);

      if (normalizedY <= lakeSurface - 0.01) continue;

      const depth = clamp(
        (normalizedY - lakeSurface + 0.01) /
          Math.max(0.08, 1 - lakeSurface),
        0,
        1,
      );
      const surfaceRow = lakeSurface * rows;
      const reflectedRow = clamp(
        Math.round(
          surfaceRow -
            Math.max(0, row - surfaceRow) * 0.72,
        ),
        0,
        rows - 1,
      );
      const reflectedIndex =
        (reflectedRow * columns + column) * 4;
      const reflectedRed = sourcePixels[reflectedIndex];
      const reflectedGreen = sourcePixels[reflectedIndex + 1];
      const reflectedBlue = sourcePixels[reflectedIndex + 2];
      const reflectedLuminance =
        reflectedRed * 0.2126 +
        reflectedGreen * 0.7152 +
        reflectedBlue * 0.0722;
      const reflectedDistance = colorDistance(
        reflectedRed,
        reflectedGreen,
        reflectedBlue,
      );
      const currentIndex = (row * columns + column) * 4;
      const currentRed = sourcePixels[currentIndex];
      const currentGreen = sourcePixels[currentIndex + 1];
      const currentBlue = sourcePixels[currentIndex + 2];
      const currentLuminance =
        currentRed * 0.2126 +
        currentGreen * 0.7152 +
        currentBlue * 0.0722;
      const currentDistance = colorDistance(
        currentRed,
        currentGreen,
        currentBlue,
      );
      const openWater = clamp(
        (currentLuminance - 164) / 68 +
          (currentDistance < 18 ? 0.28 : 0),
        0,
        1,
      );
      const reflectionInk =
        reflectedDistance > 20
          ? clamp((211 - reflectedLuminance) / 128, 0, 1)
          : 0;
      const reflectionFade = Math.exp(-depth * 2.9);
      const rightEdgeFade = clamp(
        (1 - normalizedX) / 0.045,
        0,
        1,
      );

      const placementNoise = deterministicNoise(
        column * 17 + 67,
        row * 11 + 71,
      );
      const density =
        openWater *
        rightEdgeFade *
        (0.055 +
          (1 - depth) * 0.028 +
          clamp((normalizedX - 0.58) / 0.42, 0, 1) *
            0.01 +
          reflectionInk * reflectionFade * 0.14);

      if (placementNoise > density) continue;

      const shapeNoise = deterministicNoise(
        column * 7 + 73,
        row * 19 + 79,
      );
      const toneNoise = deterministicNoise(
        column * 13 + 83,
        row * 5 + 89,
      );
      const isDarkReflection =
        reflectionInk > 0.08 &&
        toneNoise <
          0.12 + reflectionInk * reflectionFade * 0.52;
      const lengthInCells = isDarkReflection
        ? 1 + Math.floor(shapeNoise * 3)
        : 1 + Math.floor(shapeNoise * (depth > 0.48 ? 7 : 4));
      const isCoolRipple = !isDarkReflection && toneNoise > 0.56;
      const color = isDarkReflection
        ? {
            red: Math.round(
              reflectedRed * 0.58 + 49 * 0.42,
            ),
            green: Math.round(
              reflectedGreen * 0.58 + 61 * 0.42,
            ),
            blue: Math.round(
              reflectedBlue * 0.58 + 61 * 0.42,
            ),
          }
        : isCoolRipple
          ? { red: 133, green: 148, blue: 146 }
          : { red: 155, green: 158, blue: 153 };
      const alpha = isDarkReflection
        ? 0.12 +
          reflectionInk * reflectionFade * 0.3
        : 0.07 + shapeNoise * 0.11;

      waterParticles.push({
        x: gridOffsetX + column * cell + 1,
        y: gridOffsetY + row * cell + 1,
        width: lengthInCells * cell - 1,
        red: color.red,
        green: color.green,
        blue: color.blue,
        alpha,
        phase: column * 0.081 + row * 0.057,
        speed: 0.34 + shapeNoise * 0.38,
        amplitude:
          cell *
          (1 +
            Math.floor(depth * 2 + toneNoise * 1.5)),
      });

      column += lengthInCells;
    }
  }

  const aboutScene = buildAboutScene(
    width,
    height,
    dpr,
    cell,
    gridOffsetX,
    gridOffsetY,
    columns,
    rows,
    landscapeParticles,
    aboutSource,
  );

  return {
    dpr,
    cell,
    staticCanvas,
    aboutCanvas: aboutScene.canvas,
    aboutReveal: aboutScene.reveal,
    morphLayer: aboutScene.morphLayer,
    morphParticles: aboutScene.particles,
    cloudParticles,
    waterParticles,
  };
}

function updateAboutReveal(
  field: NonNullable<ReturnType<typeof buildPixelField>>,
  progress: number,
  width: number,
  height: number,
) {
  const reveal = field.aboutReveal;
  if (!reveal) return field.aboutCanvas;

  const visibleCount = Math.round(
    clamp(progress, 0, 1) * reveal.order.length,
  );

  if (visibleCount !== reveal.visibleCount) {
    const isRevealing = visibleCount > reveal.visibleCount;
    const start = isRevealing
      ? reveal.visibleCount
      : visibleCount;
    const end = isRevealing
      ? visibleCount
      : reveal.visibleCount;
    const alpha = isRevealing ? 255 : 0;

    for (let index = start; index < end; index += 1) {
      reveal.maskImageData.data[
        reveal.order[index] * 4 + 3
      ] = alpha;
    }

    reveal.visibleCount = visibleCount;
    reveal.maskContext.putImageData(
      reveal.maskImageData,
      0,
      0,
    );

    const context = reveal.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(
      0,
      0,
      reveal.canvas.width,
      reveal.canvas.height,
    );
    context.setTransform(
      reveal.dpr,
      0,
      0,
      reveal.dpr,
      0,
      0,
    );
    context.imageSmoothingEnabled = false;
    context.globalCompositeOperation = 'source-over';
    context.drawImage(
      field.aboutCanvas,
      0,
      0,
      width,
      height,
    );
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(
      reveal.maskCanvas,
      0,
      0,
      reveal.columns,
      reveal.rows,
      reveal.gridOffsetX,
      reveal.gridOffsetY,
      reveal.columns * reveal.cell,
      reveal.rows * reveal.cell,
    );
    context.globalCompositeOperation = 'source-over';
  }

  return reveal.canvas;
}

function renderFrame(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  field: NonNullable<ReturnType<typeof buildPixelField>>,
  pointer: ParticlePointer,
  progress: number,
  timestamp: number,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const sceneProgress = clamp(progress, 0, 1);
  const landscapeAlpha =
    1 -
    power3InOut(
      clamp((sceneProgress - 0.08) / 0.58, 0, 1),
    );

  context.setTransform(field.dpr, 0, 0, field.dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;

  if (sceneProgress >= 0.999) {
    context.drawImage(
      field.aboutCanvas,
      0,
      0,
      width,
      height,
    );
    return;
  }

  if (landscapeAlpha > 0.005) {
    context.globalAlpha = landscapeAlpha;
    context.drawImage(field.staticCanvas, 0, 0, width, height);
    context.globalAlpha = 1;
  }

  const time = timestamp * 0.001;

  if (landscapeAlpha > 0.025) {
    for (const particle of field.cloudParticles) {
      const wave =
        Math.sin(
          particle.x * 0.014 -
            time * particle.speed +
            particle.phase,
        ) * 7;
      const current =
        Math.sin(
          time * 0.22 +
            particle.y * 0.008 +
            particle.phase,
        ) * 5;
      const lift =
        Math.sin(
          particle.x * 0.01 +
            time * 0.44 +
            particle.phase,
        ) * 2.4;

      let x =
        particle.x +
        Math.round((wave + current) / field.cell) *
          field.cell;
      let y =
        particle.y +
        Math.round(lift / field.cell) * field.cell;

      if (pointer.active) {
        const deltaX = x - pointer.x;
        const deltaY = y - pointer.y;
        const distance = Math.hypot(deltaX, deltaY);
        const radius = 88;

        if (distance > 0 && distance < radius) {
          const force = (1 - distance / radius) * 18;
          x += (deltaX / distance) * force;
          y += (deltaY / distance) * force;
        }
      }

      x =
        particle.x +
        Math.round((x - particle.x) / field.cell) *
          field.cell;
      y =
        particle.y +
        Math.round((y - particle.y) / field.cell) *
          field.cell;

      const breathingAlpha =
        particle.alpha *
        (0.8 +
          Math.sin(time * 0.55 + particle.phase) * 0.16);
      context.fillStyle = pixelColor(
        particle.red,
        particle.green,
        particle.blue,
        breathingAlpha * landscapeAlpha,
      );
      context.fillRect(
        x,
        y,
        particle.size,
        particle.size,
      );
    }

    for (const ripple of field.waterParticles) {
      const horizontalFlow =
        Math.sin(time * ripple.speed + ripple.phase) *
        ripple.amplitude;
      const shimmer =
        0.78 +
        Math.sin(
          time * (0.7 + ripple.speed * 0.3) +
            ripple.phase * 1.7,
        ) *
          0.2;
      let x =
        ripple.x +
        Math.round(horizontalFlow / field.cell) *
          field.cell;
      let y = ripple.y;

      if (pointer.active) {
        const centerX = x + ripple.width * 0.5;
        const deltaX = centerX - pointer.x;
        const deltaY = y - pointer.y;
        const distance = Math.hypot(deltaX, deltaY);
        const radius = 112;

        if (distance > 0 && distance < radius) {
          const force =
            (1 - distance / radius) * field.cell * 2;
          x +=
            Math.round(
              ((deltaX / distance) * force) / field.cell,
            ) * field.cell;
          y +=
            Math.round(
              ((deltaY / distance) * force * 0.35) /
                field.cell,
            ) * field.cell;
        }
      }

      context.fillStyle = pixelColor(
        ripple.red,
        ripple.green,
        ripple.blue,
        ripple.alpha *
          shimmer *
          landscapeAlpha *
          clamp(
            (width - x - ripple.width) /
              (field.cell * 4),
            0,
            1,
          ),
      );
      context.fillRect(
        x,
        y,
        ripple.width,
        field.cell - 1,
      );
    }
  }

  context.globalAlpha = 1;

  const settlingProgress = clamp(
    (sceneProgress - ABOUT_CANVAS_REVEAL_START) /
      (1 - ABOUT_CANVAS_REVEAL_START),
    0,
    1,
  );

  if (settlingProgress > 0) {
    context.drawImage(
      updateAboutReveal(
        field,
        settlingProgress,
        width,
        height,
      ),
      0,
      0,
      width,
      height,
    );
  }

  if (sceneProgress <= 0) return;

  const movingParticleAlpha =
    1 -
    power3InOut(
      clamp((sceneProgress - 0.93) / 0.07, 0, 1),
    );

  const morphLayer = field.morphLayer;
  const morphData = morphLayer?.imageData.data;
  morphData?.fill(0);

  for (
    let particleIndex = 0;
    particleIndex < field.morphParticles.length;
    particleIndex += 1
  ) {
    const particle = field.morphParticles[particleIndex];
    const localProgress = clamp(
      (sceneProgress - particle.delay) /
        (1 - particle.delay),
      0,
      1,
    );

    if (localProgress <= 0) continue;

    const easedProgress = power3InOut(localProgress);
    const arc =
      Math.sin(easedProgress * Math.PI) *
      particle.arcDistance;
    const x =
      Math.round(
        (lerp(
          particle.x,
          particle.targetX,
          easedProgress,
        ) +
          particle.arcX * arc) /
          field.cell,
      ) * field.cell;
    const y =
      Math.round(
        (lerp(
          particle.y,
          particle.targetY,
          easedProgress,
        ) +
          particle.arcY * arc) /
          field.cell,
      ) * field.cell;

    const red = Math.round(
      lerp(
        particle.red,
        particle.targetRed,
        easedProgress,
      ),
    );
    const green = Math.round(
      lerp(
        particle.green,
        particle.targetGreen,
        easedProgress,
      ),
    );
    const blue = Math.round(
      lerp(
        particle.blue,
        particle.targetBlue,
        easedProgress,
      ),
    );
    const alpha =
      lerp(
        particle.alpha,
        particle.targetAlpha,
        easedProgress,
      ) * movingParticleAlpha;

    if (morphLayer && morphData) {
      const column = Math.round(
        (x / width) * (morphLayer.columns - 1),
      );
      const row = Math.round(
        (y / height) * (morphLayer.rows - 1),
      );

      if (
        column >= 0 &&
        column < morphLayer.columns &&
        row >= 0 &&
        row < morphLayer.rows
      ) {
        const dataIndex =
          (row * morphLayer.columns + column) * 4;
        const alphaByte = Math.round(alpha * 255);

        if (alphaByte >= morphData[dataIndex + 3]) {
          morphData[dataIndex] = red;
          morphData[dataIndex + 1] = green;
          morphData[dataIndex + 2] = blue;
          morphData[dataIndex + 3] = alphaByte;
        }

        if (
          particleIndex % 3 === 0 &&
          easedProgress > 0.08 &&
          easedProgress < 0.92
        ) {
          const trailColumn =
            column -
            Math.sign(particle.targetX - particle.x);
          const trailRow =
            row -
            Math.sign(particle.targetY - particle.y);

          if (
            trailColumn >= 0 &&
            trailColumn < morphLayer.columns &&
            trailRow >= 0 &&
            trailRow < morphLayer.rows
          ) {
            const trailIndex =
              (trailRow * morphLayer.columns +
                trailColumn) *
              4;
            const trailAlpha = Math.round(
              alphaByte * 0.3,
            );

            if (
              trailAlpha >
              morphData[trailIndex + 3]
            ) {
              morphData[trailIndex] = red;
              morphData[trailIndex + 1] = green;
              morphData[trailIndex + 2] = blue;
              morphData[trailIndex + 3] = trailAlpha;
            }
          }
        }
      }
    } else {
      context.fillStyle = pixelColor(
        red,
        green,
        blue,
        alpha,
      );
      context.fillRect(
        x,
        y,
        field.cell - 1,
        field.cell - 1,
      );
    }
  }

  if (morphLayer && morphData) {
    morphLayer.context.putImageData(
      morphLayer.imageData,
      0,
      0,
    );
    context.globalAlpha = 0.94;
    context.drawImage(
      morphLayer.canvas,
      0,
      0,
      morphLayer.columns,
      morphLayer.rows,
      0,
      0,
      width,
      height,
    );
    context.globalAlpha = 1;
  }
}

type InkPixelField = NonNullable<
  ReturnType<typeof buildPixelField>
>;

const inkPixelAdapter: ParticleMorphAdapter<
  InkPixelField,
  HeroScene
> = {
  sources: [
    { src: '/ink-landscape-source.png' },
    { src: '/about-studio-source.png', optional: true },
  ],
  buildField: ({
    canvas,
    sources,
    width,
    height,
    originX,
    originY,
  }) => {
    const landscapeSource = sources[0];
    if (!landscapeSource) return null;

    return buildPixelField(
      canvas,
      landscapeSource,
      sources[1],
      width,
      height,
      originX,
      originY,
    );
  },
  renderFrame: ({
    canvas,
    width,
    height,
    field,
    pointer,
    progress,
    timestamp,
  }) => {
    renderFrame(
      canvas,
      width,
      height,
      field,
      pointer,
      progress,
      timestamp,
    );
  },
  progressForScene: (scene) => (scene === 'about' ? 1 : 0),
};

export function InkPixelLandscape({
  className,
}: {
  className?: string;
}) {
  return (
    <ParticleMorphCanvas
      adapter={inkPixelAdapter}
      ariaLabel="Interactive pixel ink landscape that reforms into an about studio scene"
      className={className}
      eventName={HERO_SCENE_EVENT}
    />
  );
}
