import { PixelEngineConfig } from './types';

const COLORS = [
  '#2f63ff', // 0: blue
  '#ff4b2e', // 1: red
  '#f4b400', // 2: yellow
  '#1eae4a', // 3: green
  '#111111', // 4: ink
  '#999999', // 5: gray
];

export class PixelEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number = 0;
  private isRunning: boolean = false;

  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;
  private grid: number = 8; 

  // 回归最早那个大受好评的“交互物理流动引擎”
  // [x, y, vx, vy, colorIndex, baseLife, life, sourceX, sourceY] -> stride 9
  private stride = 9;
  private maxCount: number;
  private activeCount: number = 0;
  private particles: Float32Array = new Float32Array(0);

  // 鼠标交互
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private targetMouseX: number = -1000;
  private targetMouseY: number = -1000;

  private time: number = 0;

  constructor(config: PixelEngineConfig) {
    this.grid = config.gridSize || 8;
    this.maxCount = config.maxParticles || 6000;
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.resize();
    this.initParticles();
    this.resume();
  }

  resize() {
    if (!this.canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr);
    }
  }

  setMousePos(x: number, y: number) {
    this.targetMouseX = x;
    this.targetMouseY = y;
  }

  private initParticles() {
    const density = Math.min(1.0, this.width / 1440);
    this.activeCount = Math.floor(this.maxCount * density);
    this.particles = new Float32Array(this.activeCount * this.stride);

    for (let i = 0; i < this.activeCount; i++) {
      this.resetParticle(i * this.stride, true);
    }
  }

  private resetParticle(idx: number, init: boolean = false) {
    let sx = 0;
    let sy = 0;
    let colorIdx = 4; // 黑色

    const r = Math.random();
    if (r < 0.2) { // 蓝
      sx = this.width * 0.35; sy = this.height * 0.5; colorIdx = 0;
    } else if (r < 0.4) { // 红
      sx = this.width * 0.5; sy = this.height * 0.4; colorIdx = 1;
    } else if (r < 0.6) { // 黄
      sx = this.width * 0.4; sy = this.height * 0.6; colorIdx = 2;
    } else if (r < 0.7) { // 绿
      sx = this.width * 0.6; sy = this.height * 0.6; colorIdx = 3;
    } else { // 黑灰底层流
      sx = this.width * 0.3; 
      sy = this.height * 0.4 + Math.random() * this.height * 0.3; 
      colorIdx = Math.random() > 0.8 ? 5 : 4;
    }

    const startX = sx + (Math.random() - 0.5) * 100;
    const startY = sy + (Math.random() - 0.5) * 100;
    const vx = (Math.random() - 0.5) * 1;
    const vy = (Math.random() - 0.5) * 1;
    const life = 100 + Math.random() * 400;
    
    let currentX = startX;
    let currentY = startY;
    let currentLife = life;
    
    if (init) {
       const steps = Math.random() * life;
       currentX += vx * steps;
       currentY += vy * steps;
       currentLife -= steps;
    }

    this.particles[idx] = currentX;
    this.particles[idx + 1] = currentY;
    this.particles[idx + 2] = vx;
    this.particles[idx + 3] = vy;
    this.particles[idx + 4] = colorIdx;
    this.particles[idx + 5] = life;
    this.particles[idx + 6] = currentLife;
    this.particles[idx + 7] = sx;
    this.particles[idx + 8] = sy;
  }

  private tick = (timestamp: number) => {
    if (!this.isRunning || !this.ctx) return;
    this.time += 0.005;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 平滑插值鼠标
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.2;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.2;

    const g = this.grid;
    const mouseRepulseRadius = 150;
    const mouseRepulseRadiusSq = mouseRepulseRadius * mouseRepulseRadius;
    const friction = 0.94;
    
    // [新特性 1] 呼吸式浪涌 (Breathing Surges)
    // 整体力场强度不再是死板的常量，而是随时间进行长周期的正弦波动 (模拟海浪的一阵阵推力)
    const baseForceStrength = 0.07;
    const surge = Math.sin(this.time * 0.8) * 0.04; 
    const forceStrength = baseForceStrength + surge;

    // [新特性 2] 游走涡流 (Wandering Vortices)
    // 在右侧空间引入两个缓慢游荡的隐形引力/扭曲中心，让流线产生不可预测的动态漩涡
    const vortex1X = this.width * 0.6 + Math.sin(this.time * 0.3) * 200;
    const vortex1Y = this.height * 0.5 + Math.cos(this.time * 0.4) * 200;
    const vortex2X = this.width * 0.8 + Math.cos(this.time * 0.5) * 150;
    const vortex2Y = this.height * 0.7 + Math.sin(this.time * 0.2) * 150;

    for (let i = 0; i < this.activeCount; i++) {
      const idx = i * this.stride;
      let x = this.particles[idx]!;
      let y = this.particles[idx + 1]!;
      let vx = this.particles[idx + 2]!;
      let vy = this.particles[idx + 3]!;
      const colorIdx = this.particles[idx + 4]!;
      let life = this.particles[idx + 6]!;

      life -= 1;
      if (life <= 0 || x > this.width + 50 || x < -50 || y > this.height + 50 || y < -50) {
        this.resetParticle(idx);
        continue;
      }

      // --- 基础数学流体力场 ---
      const scale1 = 0.002;
      const scale2 = 0.005;
      let angle = Math.sin(x * scale1 + this.time) * 1.5 + 
                  Math.cos(y * scale1 - this.time) * 1.5;
                  
      if (colorIdx === 0) angle -= Math.PI / 4; 
      else if (colorIdx === 1) angle += Math.sin(y * scale2) * 0.5;
      else if (colorIdx === 3) angle += Math.PI / 6;

      let forceX = Math.cos(angle) + 0.4;
      let forceY = Math.sin(angle);

      // --- [新特性 2 应用] 计算涡流扭曲力 ---
      const dx1 = x - vortex1X;
      const dy1 = y - vortex1Y;
      const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      if (dist1 < 300) {
         // 切向力产生旋转漩涡
         forceX += (dy1 / dist1) * (1 - dist1/300) * 1.5;
         forceY -= (dx1 / dist1) * (1 - dist1/300) * 1.5;
      }

      const dx2 = x - vortex2X;
      const dy2 = y - vortex2Y;
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < 200) {
         // 第二个涡流反向旋转
         forceX -= (dy2 / dist2) * (1 - dist2/200) * 1.0;
         forceY += (dx2 / dist2) * (1 - dist2/200) * 1.0;
      }

      vx += forceX * forceStrength;
      vy += forceY * forceStrength;

      // --- 鼠标排斥交互 ---
      const dx = x - this.mouseX;
      const dy = y - this.mouseY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < mouseRepulseRadiusSq) {
        const dist = Math.sqrt(distSq);
        const repulseForce = (mouseRepulseRadius - dist) / mouseRepulseRadius;
        vx += (dx / dist) * repulseForce * 2.0;
        vy += (dy / dist) * repulseForce * 2.0;
      }

      vx *= friction;
      vy *= friction;
      x += vx;
      y += vy;

      this.particles[idx] = x;
      this.particles[idx + 1] = y;
      this.particles[idx + 2] = vx;
      this.particles[idx + 3] = vy;
      this.particles[idx + 6] = life;

      this.ctx.globalAlpha = 1.0;
      this.ctx.fillStyle = COLORS[colorIdx]!;
      
      // [新特性 3] 个体尺寸脉冲跳跃 (Size Pulsing)
      // 极少部分粒子在特定生命周期，或者基于正弦波，会突然膨胀放大 4px，然后缩回。
      // 这就像水面的粼光一样，在纯色方块里创造极强的细节活力。
      let renderSize = g;
      if (colorIdx !== 4 && colorIdx !== 5) { // 黑灰色通常作为底不跳动
         // 约 3% 的彩色粒子处于膨胀期
         if (Math.sin(life * 0.15 + x) > 0.97) {
            renderSize = g + 4; // 变成 12px 的方块
         }
      }

      this.ctx.fillRect(x, y, renderSize, renderSize);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  pause() {
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
  }

  destroy() {
    this.pause();
    this.canvas = null;
    this.ctx = null;
  }
}
