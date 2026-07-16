import { PixelEngineConfig } from './types';

// ==========================================
// 粒子像素重组引擎 (Particle Morphing)
// 万物皆流体：不再绘制死板的图片，而是控制成千上万颗粒子的引力场
// ==========================================

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    tx: number; // 目标坐标
    ty: number;
    color: string;
    hasTarget: boolean;
}

export class PixelEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number = 0;
  private isRunning: boolean = false;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;
  
  private grid: number = 8; 

  // 目标图像数据
  private heroPixels: { x: number, y: number, color: string }[] = [];
  private dragonPixels: { x: number, y: number, color: string }[] = [];

  // 全局粒子池 (5000+ 颗物理流沙)
  private particles: Particle[] = [];
  
  // 独立的特效粒子池（比如龙息火焰，阅后即焚）
  private effectParticles: any[] = [];

  private loopTick: number = 0;
  
  private heroBaseX: number = 0;
  private dragonBaseX: number = 0;
  private startY: number = 0;
  
  private time: number = 0;
  private state: 'LOADING' | 'READY' = 'LOADING';

  constructor(config: PixelEngineConfig) {}

  async mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.resize();
    
    await this.loadImages();
    this.initScene();
    this.resume();
  }

  resize() {
    if (!this.canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    if (this.ctx) this.ctx.scale(this.dpr, this.dpr);
    
    if (this.state === 'READY') {
      this.heroBaseX = Math.floor(this.width * 0.25 / this.grid) * this.grid;
      this.dragonBaseX = Math.floor(this.width * 0.70 / this.grid) * this.grid;
      this.startY = Math.floor(this.height * 0.85 / this.grid) * this.grid;
    }
  }

  private async loadImages() {
      // 解析高清图像坐标
      this.heroPixels = await this.extractImagePixels('/hero.png', 48);
      this.dragonPixels = await this.extractImagePixels('/dragon.png', 64);
      this.state = 'READY';
  }

  private extractImagePixels(src: string, resolution: number): Promise<{x: number, y: number, color: string}[]> {
      return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
              const offscreen = document.createElement('canvas');
              offscreen.width = resolution;
              offscreen.height = resolution;
              const octx = offscreen.getContext('2d')!;
              
              octx.imageSmoothingEnabled = false;
              octx.drawImage(img, 0, 0, resolution, resolution);
              
              const imgData = octx.getImageData(0, 0, resolution, resolution).data;
              const pixels = [];
              
              for (let y = 0; y < resolution; y++) {
                  for (let x = 0; x < resolution; x++) {
                      const idx = (y * resolution + x) * 4;
                      const r = imgData[idx];
                      const g = imgData[idx + 1];
                      const b = imgData[idx + 2];
                      const a = imgData[idx + 3];
                      
                      if (a > 100 && (r < 240 || g < 240 || b < 240)) {
                          pixels.push({
                              x: x, 
                              y: y - resolution, 
                              color: `rgba(${r},${g},${b},${a/255})`
                          });
                      }
                  }
              }
              resolve(pixels);
          };
          img.src = src;
      });
  }
  
  initScene() {
      if (this.state !== 'READY') return;
      
      this.heroBaseX = Math.floor(this.width * 0.25 / this.grid) * this.grid;
      this.dragonBaseX = Math.floor(this.width * 0.70 / this.grid) * this.grid;
      this.startY = Math.floor(this.height * 0.85 / this.grid) * this.grid;
      
      // 创建全局粒子池，数量取两张图中最大的像素数
      const maxParticles = Math.max(this.heroPixels.length, this.dragonPixels.length);
      this.particles = [];
      for (let i = 0; i < maxParticles; i++) {
          this.particles.push({
              x: Math.random() * this.width,
              y: Math.random() * this.height,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              tx: 0, ty: 0,
              color: 'rgba(255, 255, 255, 0.5)',
              hasTarget: false
          });
      }
      
      this.loopTick = 0;
      this.effectParticles = [];
  }

  // 设定引力目标
  private setTargets(targetPixels: {x: number, y: number, color: string}[], baseX: number, baseY: number) {
      for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          if (i < targetPixels.length) {
              p.tx = baseX + targetPixels[i].x * this.grid;
              p.ty = baseY + targetPixels[i].y * this.grid;
              p.color = targetPixels[i].color;
              p.hasTarget = true;
          } else {
              p.hasTarget = false;
          }
      }
  }

  private clearTargets() {
      for (let i = 0; i < this.particles.length; i++) {
          this.particles[i].hasTarget = false;
          // 失去引力时，爆发出强烈的随机初速度
          this.particles[i].vx = (Math.random() - 0.5) * 30;
          this.particles[i].vy = (Math.random() - 0.5) * 30 - 10;
      }
  }

  setMousePos(x: number, y: number) {}

  private tick = (timestamp: number) => {
    if (!this.isRunning || !this.ctx) return;
    this.time += 1; 
    
    // 彻底清屏，保证背景网格绝对清晰可见
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = 'source-over';

    if (this.state !== 'READY') {
        this.rafId = requestAnimationFrame(this.tick);
        return;
    }

    // ================= 电影级演出剧本 (无限循环 800 帧一局) =================
    // 0-100: 混沌星尘 (CHAOS)
    // 100: 瞬间聚合成勇者
    // 100-300: 勇者站立呼吸
    // 300: 勇者崩解，化作沙暴聚合成恶龙
    // 300-600: 恶龙站立呼吸，并在 450 帧喷火
    // 600: 恶龙解体，回归混沌
    
    this.loopTick = (this.loopTick + 1) % 800;
    
    if (this.loopTick === 0) {
        this.clearTargets();
    } else if (this.loopTick === 100) {
        this.setTargets(this.heroPixels, this.heroBaseX, this.startY);
    } else if (this.loopTick === 300) {
        this.setTargets(this.dragonPixels, this.dragonBaseX, this.startY);
    } else if (this.loopTick === 600) {
        this.clearTargets();
    }
    
    // 恶龙喷火特效 (完全独立的特效粒子)
    if (this.loopTick > 450 && this.loopTick < 500 && this.loopTick % 3 === 0) {
        const fireMouthX = this.dragonBaseX + 10 * this.grid; 
        const fireMouthY = this.startY - 40 * this.grid; 
        for(let f = 0; f < 5; f++) {
            this.effectParticles.push({
                x: fireMouthX + (Math.random() - 0.5) * 20, 
                y: fireMouthY + (Math.random() - 0.5) * 20,
                vx: -Math.random() * 12 - 5,
                vy: (Math.random() - 0.5) * 6,
                color: Math.random() > 0.5 ? 'rgba(255, 60, 0, 0.8)' : 'rgba(255, 200, 0, 0.8)',
                life: Math.random() * 40 + 20
            });
        }
    }

    // ================= 全局物理引力引擎 =================
    
    // 计算呼吸动画偏移量，让引力目标点动态浮动
    const heroJumpOffset = (this.loopTick >= 100 && this.loopTick < 300) ? Math.sin(this.time / 8) * 3 : 0;
    const dragonBreatheOffset = (this.loopTick >= 300 && this.loopTick < 600) ? Math.sin(this.time / 15) * 5 : 0;
    
    this.ctx.globalAlpha = 1.0;
    
    for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        
        if (p.hasTarget) {
            // Spring Physics (弹簧引力)
            // 根据当前聚合的是勇者还是龙，加上对应的呼吸偏移
            const currentOffset = this.loopTick < 300 ? heroJumpOffset : dragonBreatheOffset;
            const targetY = p.ty + currentOffset;
            
            const dx = p.tx - p.x;
            const dy = targetY - p.y;
            
            p.vx += dx * 0.08; // 强引力
            p.vy += dy * 0.08;
            
            p.vx *= 0.75; // 强阻尼，防止过度震荡
            p.vy *= 0.75;
        } else {
            // Chaos Physics (布朗运动/混沌)
            p.vx += (Math.random() - 0.5) * 1.5;
            p.vy += (Math.random() - 0.5) * 1.5;
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            // 屏幕边缘穿越
            if (p.x < -50) p.x = this.width + 50;
            if (p.x > this.width + 50) p.x = -50;
            if (p.y < -50) p.y = this.height + 50;
            if (p.y > this.height + 50) p.y = -50;
        }
        
        p.x += p.vx;
        p.y += p.vy;
        
        this.ctx.fillStyle = p.hasTarget ? p.color : 'rgba(200, 200, 200, 0.3)';
        this.ctx.fillRect(p.x, p.y, this.grid - 1, this.grid - 1);
    }

    // 渲染独立的特效粒子 (火焰)
    for (let i = this.effectParticles.length - 1; i >= 0; i--) {
        const ep = this.effectParticles[i];
        ep.life -= 1;
        ep.vx *= 0.96; 
        ep.vy *= 0.96; 
        ep.vy -= 0.1; // 火焰向上飘
        
        ep.x += ep.vx;
        ep.y += ep.vy;
        
        if (ep.life <= 0) {
            this.effectParticles.splice(i, 1);
            continue;
        }

        this.ctx.globalAlpha = Math.max(0, ep.life / 60);
        this.ctx.fillStyle = ep.color;
        this.ctx.fillRect(ep.x, ep.y, this.grid * (ep.life/40), this.grid * (ep.life/40));
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
