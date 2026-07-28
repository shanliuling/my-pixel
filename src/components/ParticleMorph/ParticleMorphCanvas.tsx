'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export type ParticlePointer = {
  x: number;
  y: number;
  active: boolean;
};

export type ParticleSource = {
  src: string;
  optional?: boolean;
};

export type ParticleFieldBuildContext = {
  canvas: HTMLCanvasElement;
  sources: readonly (HTMLImageElement | null)[];
  width: number;
  height: number;
  originX: number;
  originY: number;
};

export type ParticleFrameContext<Field> = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  field: Field;
  pointer: ParticlePointer;
  progress: number;
  timestamp: number;
};

export type ParticleMorphAdapter<Field, Scene> = {
  sources: readonly ParticleSource[];
  buildField: (context: ParticleFieldBuildContext) => Field | null;
  renderFrame: (context: ParticleFrameContext<Field>) => void;
  progressForScene: (scene: Scene) => number;
};

type ParticleMorphCanvasProps<Field, Scene> = {
  adapter: ParticleMorphAdapter<Field, Scene>;
  ariaLabel: string;
  className?: string;
  eventName: string;
  forwardDuration?: number;
  reverseDuration?: number;
};

async function loadParticleSource({
  src,
  optional,
}: ParticleSource): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error(`Unable to load particle source: ${src}`));
      image.src = src;
    });
    return image;
  } catch (error) {
    if (optional) return null;
    throw error;
  }
}

export function ParticleMorphCanvas<Field, Scene>({
  adapter,
  ariaLabel,
  className,
  eventName,
  forwardDuration = 1.45,
  reverseDuration = 1.05,
}: ParticleMorphCanvasProps<Field, Scene>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let disposed = false;
      let sources: readonly (HTMLImageElement | null)[] | null =
        null;
      let field: Field | null = null;
      let renderWidth = 0;
      let renderHeight = 0;
      let boundsLeft = 0;
      let boundsTop = 0;
      let sceneTween: gsap.core.Tween | null = null;
      const pointer: ParticlePointer = {
        x: -1000,
        y: -1000,
        active: false,
      };
      const transition = { value: 0 };
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      const render = (time: number) => {
        if (!field || disposed) return;

        adapter.renderFrame({
          canvas,
          width: renderWidth,
          height: renderHeight,
          field,
          pointer,
          progress: transition.value,
          timestamp: time * 1000,
        });
      };

      const draw = () => {
        if (!sources || disposed) return;

        const bounds = canvas.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;

        renderWidth = bounds.width;
        renderHeight = bounds.height;
        boundsLeft = bounds.left;
        boundsTop = bounds.top;
        field = adapter.buildField({
          canvas,
          sources,
          width: bounds.width,
          height: bounds.height,
          originX: bounds.left,
          originY: bounds.top,
        });
        if (!field) return;

        render(gsap.ticker.time);
      };

      const handleSceneChange = contextSafe!((event: Event) => {
        const scene = (event as CustomEvent<Scene>).detail;
        const target = adapter.progressForScene(scene);
        const distance = Math.abs(target - transition.value);

        sceneTween?.kill();

        if (prefersReducedMotion) {
          transition.value = target;
          render(gsap.ticker.time);
          return;
        }

        sceneTween = gsap.to(transition, {
          value: target,
          duration: Math.max(
            0.18,
            distance *
              (target >= transition.value
                ? forwardDuration
                : reverseDuration),
          ),
          ease: 'none',
          overwrite: 'auto',
        });
      });

      const handlePointerMove = (event: PointerEvent) => {
        pointer.x = event.clientX - boundsLeft;
        pointer.y = event.clientY - boundsTop;
        pointer.active =
          pointer.x >= 0 &&
          pointer.x <= renderWidth &&
          pointer.y >= 0 &&
          pointer.y <= renderHeight;
      };

      const handlePointerLeave = () => {
        pointer.active = false;
      };

      const resizeObserver = new ResizeObserver(draw);
      resizeObserver.observe(canvas);
      if (!prefersReducedMotion) {
        gsap.ticker.add(render);
      }
      window.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      });
      window.addEventListener(eventName, handleSceneChange);
      document.documentElement.addEventListener(
        'pointerleave',
        handlePointerLeave,
      );

      Promise.all(adapter.sources.map(loadParticleSource))
        .then((loadedSources) => {
          if (disposed) return;
          sources = loadedSources;
          draw();
        })
        .catch(() => {
          // The page remains usable when a required decorative source fails.
        });

      return () => {
        disposed = true;
        sceneTween?.kill();
        gsap.ticker.remove(render);
        resizeObserver.disconnect();
        window.removeEventListener(
          'pointermove',
          handlePointerMove,
        );
        window.removeEventListener(eventName, handleSceneChange);
        document.documentElement.removeEventListener(
          'pointerleave',
          handlePointerLeave,
        );
      };
    },
    { scope: canvasRef },
  );

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={ariaLabel}
      role="img"
    />
  );
}
