// Classic Doom / Wolfenstein-style 2.5D Pseudo-3D Opaque Viewport Renderer

export class DoomViewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentRoomId: string = 'bedroom';
  private targetRoomId: string = 'bedroom';
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0; // 0 to 1
  private animFrameId: number | null = null;
  private isMonochrome: boolean = false;
  private headBobTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  public setMonochrome(mono: boolean): void {
    this.isMonochrome = mono;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * (window.devicePixelRatio || 1));
    this.canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
  }

  public setRoom(roomId: string, animate: boolean = true): void {
    if (this.currentRoomId === roomId && !this.isTransitioning) return;

    if (!animate) {
      this.currentRoomId = roomId;
      this.targetRoomId = roomId;
      this.isTransitioning = false;
      this.transitionProgress = 0;
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
    this.headBobTimer += 0.04;

    if (this.isTransitioning) {
      this.transitionProgress += 0.055;
      if (this.transitionProgress >= 0.5 && this.currentRoomId !== this.targetRoomId) {
        this.currentRoomId = this.targetRoomId;
      }
      if (this.transitionProgress >= 1.0) {
        this.isTransitioning = false;
        this.transitionProgress = 0;
      }
    }
  }

  private draw(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const fgBright = this.isMonochrome ? '#ffffff' : '#44ff44';
    const fgMid = this.isMonochrome ? '#888888' : '#22aa22';
    const fgDark = this.isMonochrome ? '#333333' : '#0d400d';
    const bgSolid = '#030503';

    // Clear background
    this.ctx.fillStyle = bgSolid;
    this.ctx.fillRect(0, 0, w, h);

    // Doom transition step zoom & bob
    let zoomScale = 1.0;
    let bobY = 0;

    if (this.isTransitioning) {
      // Zoom forward toward doorway
      const p = this.transitionProgress;
      zoomScale = p < 0.5 ? 1.0 + p * 1.8 : 1.9 - (p - 0.5) * 1.8;
      bobY = Math.sin(p * Math.PI * 2) * (h * 0.05);
    } else {
      // Subtle ambient camera sway
      bobY = Math.sin(this.headBobTimer) * 1.5;
    }

    this.ctx.save();
    this.ctx.translate(cx, cy + bobY);
    this.ctx.scale(zoomScale, zoomScale);
    this.ctx.translate(-cx, -cy);

    // 1. Draw Ceiling (Dark solid with perspective receding lines)
    this.ctx.fillStyle = '#060806';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(w, 0);
    this.ctx.lineTo(w * 0.72, h * 0.28);
    this.ctx.lineTo(w * 0.28, h * 0.28);
    this.ctx.closePath();
    this.ctx.fill();

    // Ceiling guide ribs
    this.ctx.strokeStyle = fgDark;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(w * 0.15, 0);
    this.ctx.lineTo(w * 0.32, h * 0.28);
    this.ctx.moveTo(w * 0.85, 0);
    this.ctx.lineTo(w * 0.68, h * 0.28);
    this.ctx.stroke();

    // 2. Draw Floor (Solid with classic Doom perspective floor grid)
    this.ctx.fillStyle = '#050705';
    this.ctx.beginPath();
    this.ctx.moveTo(0, h);
    this.ctx.lineTo(w, h);
    this.ctx.lineTo(w * 0.72, h * 0.72);
    this.ctx.lineTo(w * 0.28, h * 0.72);
    this.ctx.closePath();
    this.ctx.fill();

    // Floor perspective tile seams
    this.ctx.strokeStyle = fgDark;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    // Radiating floor lines
    this.ctx.moveTo(0, h);
    this.ctx.lineTo(w * 0.28, h * 0.72);
    this.ctx.moveTo(w * 0.25, h);
    this.ctx.lineTo(w * 0.38, h * 0.72);
    this.ctx.moveTo(w * 0.5, h);
    this.ctx.lineTo(w * 0.5, h * 0.72);
    this.ctx.moveTo(w * 0.75, h);
    this.ctx.lineTo(w * 0.62, h * 0.72);
    this.ctx.moveTo(w, h);
    this.ctx.lineTo(w * 0.72, h * 0.72);
    // Horizontal depth slats
    this.ctx.moveTo(w * 0.1, h * 0.9);
    this.ctx.lineTo(w * 0.9, h * 0.9);
    this.ctx.moveTo(w * 0.2, h * 0.8);
    this.ctx.lineTo(w * 0.8, h * 0.8);
    this.ctx.stroke();

    // 3. Draw OPAQUE Left Wall (Solid trapezoid with vertical panel stripes)
    this.ctx.fillStyle = '#0a100a';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(w * 0.28, h * 0.28);
    this.ctx.lineTo(w * 0.28, h * 0.72);
    this.ctx.lineTo(0, h);
    this.ctx.closePath();
    this.ctx.fill();

    // Left wall panel ribs & border
    this.ctx.strokeStyle = fgMid;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.strokeStyle = fgDark;
    this.ctx.lineWidth = 1.5;
    for (const t of [0.25, 0.5, 0.75]) {
      const x = w * 0.28 * t;
      const yTop = h * 0.28 * t;
      const yBot = h - (h - h * 0.72) * t;
      this.ctx.beginPath();
      this.ctx.moveTo(x, yTop);
      this.ctx.lineTo(x, yBot);
      this.ctx.stroke();
    }

    // 4. Draw OPAQUE Right Wall (Solid trapezoid with panel stripes)
    this.ctx.fillStyle = '#0a100a';
    this.ctx.beginPath();
    this.ctx.moveTo(w, 0);
    this.ctx.lineTo(w * 0.72, h * 0.28);
    this.ctx.lineTo(w * 0.72, h * 0.72);
    this.ctx.lineTo(w, h);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = fgMid;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.strokeStyle = fgDark;
    this.ctx.lineWidth = 1.5;
    for (const t of [0.25, 0.5, 0.75]) {
      const x = w - (w - w * 0.72) * t;
      const yTop = h * 0.28 * t;
      const yBot = h - (h - h * 0.72) * t;
      this.ctx.beginPath();
      this.ctx.moveTo(x, yTop);
      this.ctx.lineTo(x, yBot);
      this.ctx.stroke();
    }

    // 5. Draw OPAQUE Back Wall
    const bwLeft = w * 0.28;
    const bwTop = h * 0.28;
    const bwWidth = w * 0.44;
    const bwHeight = h * 0.44;

    this.ctx.fillStyle = '#0e170e';
    this.ctx.fillRect(bwLeft, bwTop, bwWidth, bwHeight);

    this.ctx.strokeStyle = fgMid;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(bwLeft, bwTop, bwWidth, bwHeight);

    // 6. Draw Room-Specific Architectural Features & Props
    this.drawRoomProps(this.currentRoomId, w, h, bwLeft, bwTop, bwWidth, bwHeight, fgBright, fgMid, fgDark);

    this.ctx.restore();
  }

  private drawRoomProps(
    roomId: string,
    w: number,
    h: number,
    bwLeft: number,
    bwTop: number,
    bwWidth: number,
    bwHeight: number,
    fgBright: string,
    fgMid: string,
    fgDark: string
  ): void {
    // Back Doorway (Standard exit doorway centered on back wall)
    const doorW = bwWidth * 0.42;
    const doorH = bwHeight * 0.75;
    const doorX = bwLeft + (bwWidth - doorW) / 2;
    const doorY = bwTop + bwHeight - doorH;

    switch (roomId) {
      case 'bedroom': {
        // Window on back wall left side
        const winW = bwWidth * 0.3;
        const winH = bwHeight * 0.45;
        const winX = bwLeft + bwWidth * 0.1;
        const winY = bwTop + bwHeight * 0.15;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(winX, winY, winW, winH);
        this.ctx.strokeStyle = fgBright;
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(winX, winY, winW, winH);
        // Window cross bars
        this.ctx.beginPath();
        this.ctx.moveTo(winX + winW / 2, winY);
        this.ctx.lineTo(winX + winW / 2, winY + winH);
        this.ctx.moveTo(winX, winY + winH / 2);
        this.ctx.lineTo(winX + winW, winY + winH / 2);
        this.ctx.stroke();

        // Right side doorway
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(bwLeft + bwWidth * 0.55, doorY, doorW * 0.85, doorH);
        this.ctx.strokeStyle = fgMid;
        this.ctx.strokeRect(bwLeft + bwWidth * 0.55, doorY, doorW * 0.85, doorH);

        // Bed silhouette on foreground left
        this.ctx.fillStyle = '#142014';
        this.ctx.beginPath();
        this.ctx.moveTo(0, h * 0.7);
        this.ctx.lineTo(w * 0.22, h * 0.62);
        this.ctx.lineTo(w * 0.24, h * 0.82);
        this.ctx.lineTo(0, h * 0.95);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = fgBright;
        this.ctx.stroke();
        break;
      }

      case 'hallway': {
        // Center deep open doorway into darkness
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(doorX, doorY, doorW, doorH);
        this.ctx.strokeStyle = fgBright;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(doorX, doorY, doorW, doorH);

        // Hanging flickering light fixture
        const bulbX = w / 2;
        const bulbY = h * 0.22;
        this.ctx.strokeStyle = fgMid;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(bulbX, 0);
        this.ctx.lineTo(bulbX, bulbY);
        this.ctx.stroke();

        // Light bulb glow
        this.ctx.fillStyle = fgBright;
        this.ctx.beginPath();
        this.ctx.arc(bulbX, bulbY, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Left wall door frame
        this.ctx.strokeStyle = fgDark;
        this.ctx.beginPath();
        this.ctx.moveTo(w * 0.08, h * 0.2);
        this.ctx.lineTo(w * 0.18, h * 0.32);
        this.ctx.lineTo(w * 0.18, h * 0.68);
        this.ctx.lineTo(w * 0.08, h * 0.82);
        this.ctx.closePath();
        this.ctx.stroke();
        break;
      }

      case 'kitchen': {
        // North exit doorway
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(doorX, doorY, doorW, doorH);
        this.ctx.strokeStyle = fgMid;
        this.ctx.strokeRect(doorX, doorY, doorW, doorH);

        // Kitchen table silhouette in foreground
        const tabX = w * 0.32;
        const tabY = h * 0.62;
        const tabW = w * 0.36;
        const tabH = h * 0.12;

        this.ctx.fillStyle = '#142214';
        this.ctx.fillRect(tabX, tabY, tabW, tabH);
        this.ctx.strokeStyle = fgBright;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(tabX, tabY, tabW, tabH);

        // Table legs
        this.ctx.beginPath();
        this.ctx.moveTo(tabX + 10, tabY + tabH);
        this.ctx.lineTo(tabX + 10, h * 0.88);
        this.ctx.moveTo(tabX + tabW - 10, tabY + tabH);
        this.ctx.lineTo(tabX + tabW - 10, h * 0.88);
        this.ctx.stroke();

        // Rusted knife on table
        this.ctx.strokeStyle = fgBright;
        this.ctx.beginPath();
        this.ctx.moveTo(tabX + tabW * 0.4, tabY + 6);
        this.ctx.lineTo(tabX + tabW * 0.55, tabY + 6);
        this.ctx.stroke();
        break;
      }

      case 'pantry': {
        // Tight storage alcove with deep shelves
        this.ctx.fillStyle = '#080d08';
        this.ctx.fillRect(doorX, doorY, doorW, doorH);

        // Shelves lining the walls
        this.ctx.strokeStyle = fgMid;
        this.ctx.lineWidth = 1.5;
        for (let y = bwTop + 15; y < bwTop + bwHeight - 10; y += 22) {
          this.ctx.strokeRect(bwLeft + 8, y, bwWidth - 16, 4);
        }
        break;
      }

      case 'stairwell': {
        // Steps descending into blackness
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(doorX, doorY, doorW, doorH);

        let stepY = doorY + 6;
        const stepH = (doorH - 12) / 6;
        for (let i = 0; i < 6; i++) {
          this.ctx.fillStyle = i % 2 === 0 ? '#101c10' : '#0a120a';
          this.ctx.fillRect(doorX + 4, stepY, doorW - 8, stepH);
          this.ctx.strokeStyle = fgMid;
          this.ctx.strokeRect(doorX + 4, stepY, doorW - 8, stepH);
          stepY += stepH;
        }
        break;
      }

      case 'basement': {
        // Concrete bunker with furnace in center
        const fnW = bwWidth * 0.44;
        const fnH = bwHeight * 0.72;
        const fnX = bwLeft + (bwWidth - fnW) / 2;
        const fnY = bwTop + bwHeight - fnH;

        this.ctx.fillStyle = '#111e11';
        this.ctx.fillRect(fnX, fnY, fnW, fnH);
        this.ctx.strokeStyle = fgBright;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(fnX, fnY, fnW, fnH);

        // Furnace door grate
        const grW = fnW * 0.6;
        const grH = fnH * 0.35;
        const grX = fnX + (fnW - grW) / 2;
        const grY = fnY + fnH * 0.45;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(grX, grY, grW, grH);
        this.ctx.strokeStyle = fgMid;
        this.ctx.strokeRect(grX, grY, grW, grH);

        // Furnace bars
        this.ctx.beginPath();
        for (let x = grX + 6; x < grX + grW; x += 8) {
          this.ctx.moveTo(x, grY);
          this.ctx.lineTo(x, grY + grH);
        }
        this.ctx.stroke();

        // Ceiling steam pipes
        this.ctx.strokeStyle = fgDark;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, h * 0.15);
        this.ctx.lineTo(w, h * 0.15);
        this.ctx.stroke();
        break;
      }

      case 'corridor': {
        // Tight, ribbed biological corridor
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(doorX, doorY, doorW, doorH);
        this.ctx.strokeStyle = fgBright;
        this.ctx.strokeRect(doorX, doorY, doorW, doorH);

        // Tendon rib arches lining walls
        this.ctx.strokeStyle = fgMid;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(doorX + doorW / 2, doorY + 10, doorW / 2, Math.PI, 0);
        this.ctx.arc(doorX + doorW / 2, doorY - 15, doorW * 0.75, Math.PI, 0);
        this.ctx.stroke();
        break;
      }

      case 'mirror_room': {
        // Pedestal with large full-length mirror
        const mirW = bwWidth * 0.48;
        const mirH = bwHeight * 0.85;
        const mirX = bwLeft + (bwWidth - mirW) / 2;
        const mirY = bwTop + bwHeight - mirH - 10;

        // Mirror frame
        this.ctx.fillStyle = '#050a05';
        this.ctx.fillRect(mirX, mirY, mirW, mirH);
        this.ctx.strokeStyle = fgBright;
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(mirX, mirY, mirW, mirH);

        // Reflective glass shimmer
        this.ctx.fillStyle = this.isMonochrome ? 'rgba(255, 255, 255, 0.08)' : 'rgba(51, 255, 51, 0.08)';
        this.ctx.fillRect(mirX + 4, mirY + 4, mirW - 8, mirH - 8);

        // Dark humanoid shadow silhouette inside mirror
        const silW = mirW * 0.45;
        const silH = mirH * 0.65;
        const silX = mirX + (mirW - silW) / 2;
        const silY = mirY + mirH - silH - 4;

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        // Head
        this.ctx.arc(silX + silW / 2, silY + 14, 10, 0, Math.PI * 2);
        this.ctx.fill();
        // Shoulders & torso
        this.ctx.fillRect(silX, silY + 24, silW, silH - 24);

        // Glowing eyes in reflection
        this.ctx.fillStyle = fgBright;
        this.ctx.fillRect(silX + silW / 2 - 4, silY + 12, 2, 2);
        this.ctx.fillRect(silX + silW / 2 + 2, silY + 12, 2, 2);
        break;
      }
    }
  }
}
