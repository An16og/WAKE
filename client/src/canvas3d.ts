// 3D Point-Cloud & Vector Wireframe Room Visualizer with Smooth Camera Warp Transitions

interface Point3D {
  x: number;
  y: number;
  z: number;
  size?: number;
  alpha?: number;
}

interface Edge3D {
  p1: Point3D;
  p2: Point3D;
  density?: number;
}

export class RoomRenderer3D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentRoomId: string = 'bedroom';
  private targetRoomId: string = 'bedroom';
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0; // 0 to 1
  private animFrameId: number | null = null;

  private cameraZ: number = 0;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private focalLength: number = 320;

  private ambientParticles: Point3D[] = [];
  private themeColor: string = '#33ff33';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initParticles();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  public setThemeColor(color: string): void {
    this.themeColor = color;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
  }

  private initParticles(): void {
    this.ambientParticles = [];
    for (let i = 0; i < 50; i++) {
      this.ambientParticles.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 400,
        z: Math.random() * 800 + 50,
        size: Math.random() * 1.5 + 0.8,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  public setRoom(roomId: string, animate: boolean = true): void {
    if (this.currentRoomId === roomId && !this.isTransitioning) return;

    if (!animate) {
      this.currentRoomId = roomId;
      this.targetRoomId = roomId;
      this.isTransitioning = false;
      this.transitionProgress = 0;
      this.cameraZ = 0;
      return;
    }

    this.targetRoomId = roomId;
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  private startLoop(): void {
    const render = () => {
      this.update();
      this.draw();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private update(): void {
    // Transition camera warp logic
    if (this.isTransitioning) {
      this.transitionProgress += 0.035;
      // Dolly camera forward fast
      this.cameraZ += 28;

      if (this.transitionProgress >= 0.5 && this.currentRoomId !== this.targetRoomId) {
        this.currentRoomId = this.targetRoomId;
      }

      if (this.transitionProgress >= 1.0) {
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.cameraZ = 0;
      }
    } else {
      // Subtle organic camera breathing
      const t = Date.now() * 0.0015;
      this.cameraX = Math.sin(t * 0.8) * 8;
      this.cameraY = Math.cos(t * 0.6) * 5;
    }

    // Update ambient floating dust
    for (const p of this.ambientParticles) {
      p.z -= this.isTransitioning ? 25 : 0.6;
      p.y += Math.sin(Date.now() * 0.001 + p.x) * 0.2;
      if (p.z < 20) {
        p.z = 850;
        p.x = (Math.random() - 0.5) * 600;
        p.y = (Math.random() - 0.5) * 400;
      }
    }
  }

  private draw(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.fillStyle = '#050705';
    this.ctx.fillRect(0, 0, w, h);

    // Draw ambient floating dust dots
    for (const p of this.ambientParticles) {
      const zEff = p.z - this.cameraZ * 0.2;
      if (zEff <= 10) continue;
      const scale = this.focalLength / zEff;
      const sx = cx + (p.x - this.cameraX) * scale;
      const sy = cy + (p.y - this.cameraY) * scale;

      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        this.ctx.fillStyle = this.themeColor;
        this.ctx.globalAlpha = p.alpha! * Math.min(1, zEff / 200);
        this.ctx.fillRect(sx, sy, p.size!, p.size!);
      }
    }

    // Get current room geometry
    const edges = this.getRoomEdges(this.currentRoomId);

    // Fade factor during transition
    let fadeAlpha = 1;
    if (this.isTransitioning) {
      fadeAlpha = 1 - Math.sin(this.transitionProgress * Math.PI) * 0.7;
    }

    // Render 3D dotted lines
    for (const edge of edges) {
      this.drawDottedLine(edge.p1, edge.p2, edge.density || 16, cx, cy, fadeAlpha);
    }

    this.ctx.globalAlpha = 1.0;
  }

  private drawDottedLine(p1: Point3D, p2: Point3D, count: number, cx: number, cy: number, alphaMultiplier: number): void {
    this.ctx.fillStyle = this.themeColor;

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = p1.x + (p2.x - p1.x) * t - this.cameraX;
      const y = p1.y + (p2.y - p1.y) * t - this.cameraY;
      const z = p1.z + (p2.z - p1.z) * t - (this.isTransitioning ? this.cameraZ : 0);

      if (z <= 15) continue; // Behind or clipping camera

      const scale = this.focalLength / z;
      const sx = cx + x * scale;
      const sy = cy + y * scale;

      const distAlpha = Math.max(0.1, Math.min(1.0, 1.2 - z / 800));
      this.ctx.globalAlpha = distAlpha * alphaMultiplier;

      const dotSize = z < 250 ? 2.5 : z < 450 ? 2.0 : 1.5;
      this.ctx.fillRect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
    }
  }

  private getRoomEdges(roomId: string): Edge3D[] {
    const edges: Edge3D[] = [];

    // Base room bounding cube (walls, ceiling, floor) in perspective
    const rw = 220;
    const rh = 140;
    const zNear = 120;
    const zFar = 550;

    // Outer corridor/room corners
    const c1 = { x: -rw, y: -rh, z: zNear };
    const c2 = { x: rw, y: -rh, z: zNear };
    const c3 = { x: rw, y: rh, z: zNear };
    const c4 = { x: -rw, y: rh, z: zNear };

    const f1 = { x: -rw * 0.8, y: -rh * 0.8, z: zFar };
    const f2 = { x: rw * 0.8, y: -rh * 0.8, z: zFar };
    const f3 = { x: rw * 0.8, y: rh * 0.8, z: zFar };
    const f4 = { x: -rw * 0.8, y: rh * 0.8, z: zFar };

    // Connecting corridor wall lines
    edges.push({ p1: c1, p2: f1, density: 24 });
    edges.push({ p1: c2, p2: f2, density: 24 });
    edges.push({ p1: c3, p2: f3, density: 24 });
    edges.push({ p1: c4, p2: f4, density: 24 });

    // Back wall rectangle
    edges.push({ p1: f1, p2: f2, density: 20 });
    edges.push({ p1: f2, p2: f3, density: 16 });
    edges.push({ p1: f3, p2: f4, density: 20 });
    edges.push({ p1: f4, p2: f1, density: 16 });

    // Floor perspective guide rails
    edges.push({ p1: { x: -rw * 0.35, y: rh, z: zNear }, p2: { x: -rw * 0.25, y: rh * 0.8, z: zFar }, density: 18 });
    edges.push({ p1: { x: rw * 0.35, y: rh, z: zNear }, p2: { x: rw * 0.25, y: rh * 0.8, z: zFar }, density: 18 });

    // Specialized 3D objects per room
    switch (roomId) {
      case 'bedroom': {
        // Bed frame in 3D: on left floor
        const b1 = { x: -140, y: 70, z: 220 };
        const b2 = { x: -50, y: 70, z: 220 };
        const b3 = { x: -50, y: 90, z: 380 };
        const b4 = { x: -140, y: 90, z: 380 };
        edges.push({ p1: b1, p2: b2, density: 12 });
        edges.push({ p1: b2, p2: b3, density: 16 });
        edges.push({ p1: b3, p2: b4, density: 12 });
        edges.push({ p1: b4, p2: b1, density: 16 });

        // Window on back wall
        const w1 = { x: -60, y: -60, z: zFar - 5 };
        const w2 = { x: 20, y: -60, z: zFar - 5 };
        const w3 = { x: 20, y: 10, z: zFar - 5 };
        const w4 = { x: -60, y: 10, z: zFar - 5 };
        edges.push({ p1: w1, p2: w2, density: 10 });
        edges.push({ p1: w2, p2: w3, density: 8 });
        edges.push({ p1: w3, p2: w4, density: 10 });
        edges.push({ p1: w4, p2: w1, density: 8 });
        break;
      }

      case 'hallway': {
        // Overhead hanging bulb line and point
        const hTop = { x: 0, y: -rh * 0.8, z: 300 };
        const hBulb = { x: 0, y: -20, z: 300 };
        edges.push({ p1: hTop, p2: hBulb, density: 14 });

        // Doorway arch on back wall
        const d1 = { x: -40, y: rh * 0.8, z: zFar - 5 };
        const d2 = { x: -40, y: -10, z: zFar - 5 };
        const d3 = { x: 40, y: -10, z: zFar - 5 };
        const d4 = { x: 40, y: rh * 0.8, z: zFar - 5 };
        edges.push({ p1: d1, p2: d2, density: 14 });
        edges.push({ p1: d2, p2: d3, density: 10 });
        edges.push({ p1: d3, p2: d4, density: 14 });
        break;
      }

      case 'kitchen': {
        // Table in center
        const t1 = { x: -70, y: 40, z: 320 };
        const t2 = { x: 70, y: 40, z: 320 };
        const t3 = { x: 50, y: 55, z: 420 };
        const t4 = { x: -50, y: 55, z: 420 };
        edges.push({ p1: t1, p2: t2, density: 14 });
        edges.push({ p1: t2, p2: t3, density: 12 });
        edges.push({ p1: t3, p2: t4, density: 14 });
        edges.push({ p1: t4, p2: t1, density: 12 });
        // Table legs
        edges.push({ p1: t1, p2: { x: -70, y: 95, z: 320 }, density: 8 });
        edges.push({ p1: t2, p2: { x: 70, y: 95, z: 320 }, density: 8 });
        break;
      }

      case 'pantry': {
        // Storage shelving racks on side walls
        for (let y = -40; y <= 60; y += 30) {
          edges.push({
            p1: { x: -rw * 0.9, y, z: 200 },
            p2: { x: -rw * 0.5, y: y * 0.9, z: 450 },
            density: 15
          });
        }
        break;
      }

      case 'stairwell': {
        // Steps descending down into depth
        let stepY = 10;
        let stepZ = 180;
        for (let i = 0; i < 6; i++) {
          const l1 = { x: -80, y: stepY, z: stepZ };
          const l2 = { x: 80, y: stepY, z: stepZ };
          const l3 = { x: 80, y: stepY, z: stepZ + 50 };
          const l4 = { x: -80, y: stepY, z: stepZ + 50 };
          edges.push({ p1: l1, p2: l2, density: 12 });
          edges.push({ p1: l2, p2: l3, density: 8 });
          edges.push({ p1: l3, p2: l4, density: 12 });
          edges.push({ p1: l4, p2: l1, density: 8 });
          stepY += 16;
          stepZ += 55;
        }
        break;
      }

      case 'basement': {
        // Ceiling steam pipe lines
        edges.push({
          p1: { x: -rw * 0.5, y: -rh * 0.7, z: zNear },
          p2: { x: -rw * 0.35, y: -rh * 0.7, z: zFar },
          density: 22
        });
        edges.push({
          p1: { x: rw * 0.5, y: -rh * 0.7, z: zNear },
          p2: { x: rw * 0.35, y: -rh * 0.7, z: zFar },
          density: 22
        });
        // Furnace box in center
        const fn1 = { x: -50, y: 10, z: 420 };
        const fn2 = { x: 50, y: 10, z: 420 };
        const fn3 = { x: 50, y: 90, z: 420 };
        const fn4 = { x: -50, y: 90, z: 420 };
        edges.push({ p1: fn1, p2: fn2, density: 12 });
        edges.push({ p1: fn2, p2: fn3, density: 10 });
        edges.push({ p1: fn3, p2: fn4, density: 12 });
        edges.push({ p1: fn4, p2: fn1, density: 10 });
        break;
      }

      case 'corridor': {
        // Narrow undulating rib cage arches
        for (let z = 180; z <= 480; z += 90) {
          const arch1 = { x: -rw * 0.6, y: rh * 0.7, z };
          const arch2 = { x: -rw * 0.5, y: -rh * 0.6, z };
          const arch3 = { x: rw * 0.5, y: -rh * 0.6, z };
          const arch4 = { x: rw * 0.6, y: rh * 0.7, z };
          edges.push({ p1: arch1, p2: arch2, density: 12 });
          edges.push({ p1: arch2, p2: arch3, density: 14 });
          edges.push({ p1: arch3, p2: arch4, density: 12 });
        }
        break;
      }

      case 'mirror_room': {
        // Floating 3D oval mirror frame in center
        const segments = 24;
        const radiusX = 65;
        const radiusY = 95;
        const centerZ = 380;
        const pts: Point3D[] = [];

        for (let i = 0; i < segments; i++) {
          const ang = (i / segments) * Math.PI * 2;
          pts.push({
            x: Math.cos(ang) * radiusX,
            y: Math.sin(ang) * radiusY - 10,
            z: centerZ
          });
        }
        for (let i = 0; i < segments; i++) {
          edges.push({
            p1: pts[i],
            p2: pts[(i + 1) % segments],
            density: 6
          });
        }
        // Mirror pedestal
        edges.push({ p1: { x: 0, y: 85, z: centerZ }, p2: { x: 0, y: 130, z: centerZ }, density: 10 });
        edges.push({ p1: { x: -35, y: 130, z: centerZ }, p2: { x: 35, y: 130, z: centerZ }, density: 8 });
        break;
      }
    }

    return edges;
  }
}
