'use client';

import { useRef, useEffect } from 'react';
import { PixelEngine } from './PixelEngine';

export function PixelStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    engineRef.current = new PixelEngine({
      gridSize: 8,
      maxParticles: 4000, // 稍微降低数量以保证移动端和鼠标交互的绝对丝滑
    });

    engineRef.current.mount(canvasRef.current);

    const handleResize = () => {
      engineRef.current?.resize();
    };

    const handleMouseMove = (e: MouseEvent) => {
      engineRef.current?.setMousePos(e.clientX, e.clientY);
    };

    // 当鼠标离开窗口时，把坐标移出屏幕
    const handleMouseLeave = () => {
      engineRef.current?.setMousePos(-1000, -1000);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      engineRef.current?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
      }}
      aria-hidden="true"
    />
  );
}
