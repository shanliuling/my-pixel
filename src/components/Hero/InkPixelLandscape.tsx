'use client';

import { useEffect, useRef } from 'react';

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

type PointerPosition = {
  x: number;
  y: number;
  active: boolean;
};

const SOURCE_CROP = {
  x: 560,
  y: 105,
  width: 1120,
  height: 820,
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

function lakeSurfaceAt(column: number, columns: number) {
  const normalizedX = column / columns;

  return (
    0.785 +
    Math.sin(column * 0.045) * 0.022 +
    Math.sin(column * 0.017 + 1.2) * 0.011 -
    clamp((normalizedX - 0.72) / 0.28, 0, 1) * 0.012
  );
}

async function loadLandscapeSource() {
  const image = new Image();
  image.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load ink landscape source'));
    image.src = '/ink-landscape-source.png';
  });

  return image;
}

function buildPixelField(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement,
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
        sourceAlpha > 0.2 &&
        distance > minimumInkDistance &&
        (luminance < maximumWashLuminance || chroma > 17);
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

      if (isInkWashBridge) {
        staticContext.fillStyle = pixelColor(
          bridgeRed,
          bridgeGreen,
          bridgeBlue,
          bridgeAlpha,
        );
        staticContext.fillRect(x, y, cell - 1, cell - 1);
        continue;
      }

      if (isFlowingMist) {
        cloudParticles.push({
          x,
          y,
          size: cell - 1,
          red,
          green,
          blue,
          alpha: Math.min(alpha, 0.64),
          phase: column * 0.073 + row * 0.119,
          speed: 0.28 + ((column * 17 + row * 13) % 19) / 70,
        });
        continue;
      }

      const inkBoost = luminance < 115 ? 0.88 : 0.96;
      const adjustedRed = Math.round(red * inkBoost);
      const adjustedGreen = Math.round(green * inkBoost);
      const adjustedBlue = Math.round(blue * inkBoost);

      staticContext.fillStyle = pixelColor(
        adjustedRed,
        adjustedGreen,
        adjustedBlue,
        alpha,
      );
      staticContext.fillRect(x, y, cell - 1, cell - 1);
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

      const placementNoise = deterministicNoise(
        column * 17 + 67,
        row * 11 + 71,
      );
      const density =
        openWater *
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

  return {
    dpr,
    cell,
    staticCanvas,
    cloudParticles,
    waterParticles,
  };
}

function renderFrame(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  field: NonNullable<ReturnType<typeof buildPixelField>>,
  pointer: PointerPosition,
  timestamp: number,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.setTransform(field.dpr, 0, 0, field.dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.drawImage(field.staticCanvas, 0, 0, width, height);

  const time = timestamp * 0.001;

  for (const particle of field.cloudParticles) {
    const wave =
      Math.sin(particle.x * 0.014 - time * particle.speed + particle.phase) *
      7;
    const current =
      Math.sin(time * 0.22 + particle.y * 0.008 + particle.phase) * 5;
    const lift =
      Math.sin(particle.x * 0.01 + time * 0.44 + particle.phase) * 2.4;

    let x =
      particle.x +
      Math.round((wave + current) / field.cell) * field.cell;
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
      Math.round((x - particle.x) / field.cell) * field.cell;
    y =
      particle.y +
      Math.round((y - particle.y) / field.cell) * field.cell;

    const breathingAlpha =
      particle.alpha *
      (0.8 + Math.sin(time * 0.55 + particle.phase) * 0.16);
    context.fillStyle = pixelColor(
      particle.red,
      particle.green,
      particle.blue,
      breathingAlpha,
    );
    context.fillRect(x, y, particle.size, particle.size);
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
      Math.round(horizontalFlow / field.cell) * field.cell;
    let y = ripple.y;

    if (pointer.active) {
      const centerX = x + ripple.width * 0.5;
      const deltaX = centerX - pointer.x;
      const deltaY = y - pointer.y;
      const distance = Math.hypot(deltaX, deltaY);
      const radius = 112;

      if (distance > 0 && distance < radius) {
        const force = (1 - distance / radius) * field.cell * 2;
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
      ripple.alpha * shimmer,
    );
    context.fillRect(
      x,
      y,
      ripple.width,
      field.cell - 1,
    );
  }
}

export function InkPixelLandscape({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrame = 0;
    let disposed = false;
    let source: HTMLImageElement | null = null;
    const pointer: PointerPosition = {
      x: -1000,
      y: -1000,
      active: false,
    };
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const draw = () => {
      if (!source || disposed) return;

      cancelAnimationFrame(animationFrame);
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const field = buildPixelField(
        canvas,
        source,
        bounds.width,
        bounds.height,
        bounds.left,
        bounds.top,
      );
      if (!field) return;

      const animate = (timestamp: number) => {
        renderFrame(
          canvas,
          bounds.width,
          bounds.height,
          field,
          pointer,
          timestamp,
        );

        if (!prefersReducedMotion && !disposed) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animate(0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.x <= bounds.width &&
        pointer.y >= 0 &&
        pointer.y <= bounds.height;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    loadLandscapeSource()
      .then((loadedSource) => {
        if (disposed) return;
        source = loadedSource;
        draw();
      })
      .catch(() => {
        // The hero remains usable if the decorative source cannot be loaded.
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener(
        'pointerleave',
        handlePointerLeave,
      );
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Flowing pixel ink landscape with mountains, a red sun, pavilion, tree, and boat"
      role="img"
    />
  );
}
