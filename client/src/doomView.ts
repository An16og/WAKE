// 1-Bit Pixel Art Renderer with Authentic Atkinson Dithering & 4-Frame Doom Step Sequence
// Style: Stark high-contrast 1-bit monochrome, classic Macintosh graphics, heavy stippling effect.

export class DoomViewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentRoomId: string = 'bedroom';
  private targetRoomId: string = 'bedroom';
  private isTransitioning: boolean = false;
  private transitionFrame: number = 0; // 0, 1, 2, 3 (4 sequential frames)
  private transitionTimer: any = null;
  private animFrameId: number | null = null;
  private isMonochrome: boolean = false;
  private tickCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  private mirrorMorphStage: number = 0;
  private mirrorMode: 'beast' | 'meta' = 'beast';
  private sanityLevel: number = 10;

  public setMirrorMorphStage(stage: number): void {
    this.mirrorMorphStage = Math.max(0, Math.min(4, stage));
  }

  public setMirrorMode(mode: 'beast' | 'meta'): void {
    this.mirrorMode = mode;
  }

  public setSanityLevel(level: number): void {
    this.sanityLevel = Math.max(0, Math.min(10, level));
  }

  public setSanity(level: number): void {
    this.setSanityLevel(level);
  }

  public setMonochrome(mono: boolean): void {
    this.isMonochrome = mono;
  }

  private resize(): void {
    // Render at crisp retro resolution (320x180) then scale up cleanly with image-rendering: pixelated
    this.canvas.width = 320;
    this.canvas.height = 180;
  }

  public setRoom(roomId: string, animate: boolean = true): void {
    if (this.currentRoomId === roomId && !this.isTransitioning) return;

    if (!animate) {
      this.currentRoomId = roomId;
      this.targetRoomId = roomId;
      this.isTransitioning = false;
      this.transitionFrame = 0;
      return;
    }

    this.targetRoomId = roomId;
    this.isTransitioning = true;
    this.transitionFrame = 0;

    // Advance through exactly 4 sequential retro transition frames
    if (this.transitionTimer) clearInterval(this.transitionTimer);
    this.transitionTimer = setInterval(() => {
      this.transitionFrame++;
      if (this.transitionFrame === 2) {
        this.currentRoomId = this.targetRoomId;
      }
      if (this.transitionFrame >= 4) {
        clearInterval(this.transitionTimer);
        this.transitionTimer = null;
        this.isTransitioning = false;
        this.transitionFrame = 0;
      }
    }, 110);
  }

  private startLoop(): void {
    const render = () => {
      this.tickCount++;
      this.draw();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  public destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.transitionTimer) clearInterval(this.transitionTimer);
  }

  // ==========================================
  // 1-BIT DRAWING PRIMITIVES & MACINTOSH STIPPLE
  // ==========================================

  private setPixel(buf: Uint8Array, w: number, h: number, x: number, y: number, v: 0 | 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && x < w && y >= 0 && y < h) {
      buf[y * w + x] = v;
    }
  }

  private drawHLine(buf: Uint8Array, w: number, h: number, x: number, y: number, len: number, v: 0 | 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    len = Math.floor(len);
    if (y < 0 || y >= h) return;
    const startX = Math.max(0, x);
    const endX = Math.min(w - 1, x + len);
    for (let curX = startX; curX <= endX; curX++) {
      buf[y * w + curX] = v;
    }
  }

  private drawVLine(buf: Uint8Array, w: number, h: number, x: number, y: number, len: number, v: 0 | 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    len = Math.floor(len);
    if (x < 0 || x >= w) return;
    const startY = Math.max(0, y);
    const endY = Math.min(h - 1, y + len);
    for (let curY = startY; curY <= endY; curY++) {
      buf[curY * w + x] = v;
    }
  }

  private drawLine(
    buf: Uint8Array,
    w: number,
    h: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    v: 0 | 1,
    thick: number = 1
  ): void {
    x0 = Math.floor(x0);
    y0 = Math.floor(y0);
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      for (let tx = 0; tx < thick; tx++) {
        for (let ty = 0; ty < thick; ty++) {
          this.setPixel(buf, w, h, x0 + tx, y0 + ty, v);
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  private drawSolidRect(buf: Uint8Array, w: number, h: number, rx: number, ry: number, rw: number, rh: number, v: 0 | 1): void {
    rx = Math.floor(rx);
    ry = Math.floor(ry);
    rw = Math.floor(rw);
    rh = Math.floor(rh);
    for (let y = ry; y < ry + rh; y++) {
      this.drawHLine(buf, w, h, rx, y, rw - 1, v);
    }
  }

  private drawOutlineRect(
    buf: Uint8Array,
    w: number,
    h: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    v: 0 | 1,
    thickness: number = 1
  ): void {
    rx = Math.floor(rx);
    ry = Math.floor(ry);
    rw = Math.floor(rw);
    rh = Math.floor(rh);
    for (let t = 0; t < thickness; t++) {
      this.drawHLine(buf, w, h, rx, ry + t, rw - 1, v);
      this.drawHLine(buf, w, h, rx, ry + rh - 1 - t, rw - 1, v);
      this.drawVLine(buf, w, h, rx + t, ry, rh - 1, v);
      this.drawVLine(buf, w, h, rx + rw - 1 - t, ry, rh - 1, v);
    }
  }

  private drawCircle(
    buf: Uint8Array,
    w: number,
    h: number,
    cx: number,
    cy: number,
    r: number,
    fill: boolean = false,
    outline: boolean = true
  ): void {
    cx = Math.floor(cx);
    cy = Math.floor(cy);
    r = Math.floor(r);
    const r2 = r * r;
    const innerR2 = Math.max(0, (r - 1.4) * (r - 1.4));

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        const px = cx + dx;
        const py = cy + dy;
        if (fill && d2 <= r2) {
          this.setPixel(buf, w, h, px, py, 1);
        } else if (outline && d2 <= r2 && d2 >= innerR2) {
          this.setPixel(buf, w, h, px, py, 1);
        }
      }
    }
  }

  private drawDitherRect(
    buf: Uint8Array,
    w: number,
    h: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    pattern: 'checkered50' | 'stipple25' | 'stipple12' | 'diagHatch' | 'horiz' | 'vert'
  ): void {
    rx = Math.floor(rx);
    ry = Math.floor(ry);
    rw = Math.floor(rw);
    rh = Math.floor(rh);

    for (let y = ry; y < ry + rh; y++) {
      if (y < 0 || y >= h) continue;
      for (let x = rx; x < rx + rw; x++) {
        if (x < 0 || x >= w) continue;
        let on = false;
        switch (pattern) {
          case 'checkered50':
            on = (x + y) % 2 === 0;
            break;
          case 'stipple25':
            on = (x % 2 === 0) && (y % 2 === 0) && (((x >> 1) + (y >> 1)) % 2 === 0);
            break;
          case 'stipple12':
            on = (x % 4 === 0) && (y % 4 === 0) && (((x >> 2) + (y >> 2)) % 2 === 0);
            break;
          case 'diagHatch':
            on = (x + y) % 4 === 0;
            break;
          case 'horiz':
            on = y % 3 === 0;
            break;
          case 'vert':
            on = x % 3 === 0;
            break;
        }
        if (on) {
          buf[y * w + x] = 1;
        }
      }
    }
  }

  // ==========================================
  // MASTER RENDER PIPELINE
  // ==========================================

  private draw(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    const imgData = this.ctx.createImageData(w, h);
    const data = imgData.data;

    // Palette: pure high-contrast black vs white (or green phosphor)
    const onR = this.isMonochrome ? 255 : 51;
    const onG = this.isMonochrome ? 255 : 255;
    const onB = this.isMonochrome ? 255 : 51;

    // 1-Bit pixel buffer (0 = Pitch Black, 1 = Stark Foreground)
    const buf = new Uint8Array(w * h);

    // Frame sequence: 0, 1, 2, 3
    // In transition: use transitionFrame
    // In idle: subtle 2-frame breath loop (0 vs 1 every 60 ticks)
    const activeFrame = this.isTransitioning
      ? this.transitionFrame
      : (Math.floor(this.tickCount / 40) % 2 === 0 ? 0 : 1);

    // Zoom and camera bobbing for the 4-frame retro animation sequence
    let zoom = 1.0;
    let bobY = 0;

    if (this.isTransitioning) {
      if (this.transitionFrame === 1) {
        zoom = 1.18;
        bobY = 3;
      } else if (this.transitionFrame === 2) {
        zoom = 1.45;
        bobY = -2;
      } else if (this.transitionFrame === 3) {
        zoom = 1.06;
        bobY = 1;
      }
    }

    // 1. Draw Architectural 2.5D Room Perspective
    this.renderArchitecture(buf, w, h, cx, cy + bobY, zoom);

    // 2. Draw Highly-Defined 1-Bit Subject Asset for Active Room
    this.renderRoomSubject(this.currentRoomId, buf, w, h, cx, cy + bobY, zoom, activeFrame);

    // 3. Frame 2: Threshold transition flash (invert pixels on burst lines)
    if (this.isTransitioning && this.transitionFrame === 2) {
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          buf[idx] = buf[idx] === 1 ? 0 : 1;
        }
      }
    }

    // 4. Rasterize 1-Bit Buffer to Canvas with Dynamic Sanity Distortion
    const isGlitching = this.sanityLevel < 7 || (this.mirrorMode === 'meta' && this.mirrorMorphStage > 0);
    const jitterMagnitude = isGlitching ? Math.floor((10 - this.sanityLevel) * 0.9) : 0;

    for (let y = 0; y < h; y++) {
      // Horizontal scanline displacement during glitch/sanity drop
      let lineShift = 0;
      if (isGlitching && (y % 5 === 0 || y % 8 === 0) && Math.sin(this.tickCount * 0.3 + y) > 0.4) {
        lineShift = Math.floor(Math.sin(this.tickCount * 0.5 + y) * (jitterMagnitude + 2));
      }

      for (let x = 0; x < w; x++) {
        const sampleX = Math.max(0, Math.min(w - 1, x + lineShift));
        const bufIdx = y * w + sampleX;
        const pixelIdx = (y * w + x) * 4;

        if (buf[bufIdx] === 1) {
          data[pixelIdx] = onR;
          data[pixelIdx + 1] = onG;
          data[pixelIdx + 2] = onB;
          data[pixelIdx + 3] = 255;
        } else {
          data[pixelIdx] = 0;
          data[pixelIdx + 1] = 0;
          data[pixelIdx + 2] = 0;
          data[pixelIdx + 3] = 255;
        }
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }

  // ==========================================
  // ARCHITECTURAL 2.5D BOUNDS
  // ==========================================

  private renderArchitecture(buf: Uint8Array, w: number, h: number, cx: number, cy: number, zoom: number): void {
    // Clean, crisp perspective tunnel
    const halfW = Math.floor((w * 0.28) * zoom);
    const halfH = Math.floor((h * 0.28) * zoom);

    const leftX = cx - halfW;
    const rightX = cx + halfW;
    const topY = cy - halfH;
    const botY = cy + halfH;

    // Corner perspective diagonals
    this.drawLine(buf, w, h, 0, 0, leftX, topY, 1, 2);
    this.drawLine(buf, w, h, w - 1, 0, rightX, topY, 1, 2);
    this.drawLine(buf, w, h, 0, h - 1, leftX, botY, 1, 2);
    this.drawLine(buf, w, h, w - 1, h - 1, rightX, botY, 1, 2);

    // Back wall boundary rectangle
    this.drawOutlineRect(buf, w, h, leftX, topY, rightX - leftX, botY - topY, 1, 2);

    // Left wall: vertical panel seams
    for (let x = 16; x < leftX; x += 24) {
      const topYAtX = (topY / leftX) * x;
      const botYAtX = h - 1 - ((h - 1 - botY) / leftX) * x;
      this.drawLine(buf, w, h, x, topYAtX, x, botYAtX, 1, 1);
    }

    // Right wall: vertical panel seams
    for (let x = rightX + 24; x < w - 8; x += 24) {
      const t = (w - 1 - x) / Math.max(1, w - 1 - rightX);
      const topYAtX = topY * (1 - t);
      const botYAtX = h - 1 - (h - 1 - botY) * (1 - t);
      this.drawLine(buf, w, h, x, topYAtX, x, botYAtX, 1, 1);
    }

    // Floorboards: crisp 1-point perspective radiating slats
    const floorSlats = 8;
    for (let s = 1; s < floorSlats; s++) {
      const startX = leftX + Math.floor((rightX - leftX) * (s / floorSlats));
      const endX = Math.floor(w * (s / floorSlats));
      this.drawLine(buf, w, h, startX, botY, endX, h - 1, 1, 1);
    }

    // Floorboard horizontal planks
    for (let y = botY + 12; y < h; y += 18) {
      const t = (y - botY) / Math.max(1, h - botY);
      const startX = leftX - Math.floor(leftX * t);
      const len = (rightX + Math.floor((w - rightX) * t)) - startX;
      this.drawHLine(buf, w, h, startX, y, len, 1);
    }

    // Ceiling: slatted timber rafters
    for (let y = 6; y < topY; y += 14) {
      const t = y / Math.max(1, topY);
      const startX = Math.floor(leftX * t);
      const endX = w - startX;
      this.drawHLine(buf, w, h, startX, y, endX - startX, 1);
    }
  }

  // ==========================================
  // HANDCRAFTED 1-BIT ROOM SUBJECT ASSETS
  // ==========================================

  private renderRoomSubject(
    roomId: string,
    buf: Uint8Array,
    w: number,
    h: number,
    cx: number,
    cy: number,
    zoom: number,
    frame: number
  ): void {
    switch (roomId) {
      case 'bedroom':
        this.renderBedroom(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'server_archive':
        this.renderServerArchive(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'hallway':
        this.renderHallway(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'flesh_cellar':
        this.renderFleshCellar(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'kitchen':
        this.renderKitchen(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'basement':
        this.renderBasement(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'simulation_core':
        this.renderSimulationCore(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'stairwell':
        this.renderStairwell(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'pulsing_antechamber':
        this.renderPulsingAntechamber(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'corridor':
        this.renderCorridor(buf, w, h, cx, cy, zoom, frame);
        break;
      case 'mirror_vault':
      case 'mirror_room':
        this.renderMirrorRoom(buf, w, h, cx, cy, zoom, frame);
        break;
      default:
        this.renderBedroom(buf, w, h, cx, cy, zoom, frame);
        break;
    }
  }

  // ------------------------------------------
  // PATH 1: SERVER ARCHIVE
  // Subject: Mainframe server racks, glowing CRT displays, binary code scanlines
  // ------------------------------------------
  private renderServerArchive(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, _frame: number): void {
    // Left Server Racks
    for (let r = 0; r < 3; r++) {
      const rx = 16 + r * 28;
      this.drawOutlineRect(buf, w, h, rx, 18, 22, 130, 1, 2);
      for (let slot = 24; slot < 140; slot += 10) {
        this.drawHLine(buf, w, h, rx + 2, slot, 18, 1);
        if ((slot + this.tickCount) % 3 === 0) {
          this.drawSolidRect(buf, w, h, rx + 4, slot - 3, 3, 2, 1);
        }
      }
    }

    // Right Server Racks
    for (let r = 0; r < 3; r++) {
      const rx = w - 40 - r * 28;
      this.drawOutlineRect(buf, w, h, rx, 18, 22, 130, 1, 2);
      for (let slot = 24; slot < 140; slot += 10) {
        this.drawHLine(buf, w, h, rx + 2, slot, 18, 1);
        if ((slot + this.tickCount * 2) % 4 === 0) {
          this.drawSolidRect(buf, w, h, rx + 15, slot - 3, 3, 2, 1);
        }
      }
    }

    // Central Corridor CRT Terminal Console
    const termX = cx - 36;
    const termY = cy - 20;
    this.drawOutlineRect(buf, w, h, termX, termY, 72, 54, 1, 2);
    this.drawDitherRect(buf, w, h, termX + 4, termY + 4, 64, 46, 'stipple25');
    for (let l = termY + 10; l < termY + 44; l += 7) {
      this.drawHLine(buf, w, h, termX + 8, l, 40 + ((l * 7) % 18), 1);
    }
  }

  // ------------------------------------------
  // PATH 2: FLESH CELLAR
  // Subject: Subterranean stone vault, flooded floor, heavy steel blast door
  // ------------------------------------------
  private renderFleshCellar(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, _frame: number): void {
    // Waterline on floor
    const waterY = cy + 30;
    for (let wy = waterY; wy < h - 4; wy += 4) {
      this.drawDitherRect(buf, w, h, 10, wy, w - 20, 2, 'checkered50');
    }

    // Heavy reinforced blast door in center
    const doorX = cx - 44;
    const doorY = cy - 40;
    this.drawOutlineRect(buf, w, h, doorX, doorY, 88, 76, 1, 3);
    this.drawLine(buf, w, h, doorX, doorY, doorX + 88, doorY + 76, 1, 2);
    this.drawLine(buf, w, h, doorX + 88, doorY, doorX, doorY + 76, 1, 2);
    this.drawCircle(buf, w, h, cx, cy - 2, 14, false, true);
    this.drawCircle(buf, w, h, cx, cy - 2, 6, true, true);

    // Dripping ceiling stalactites
    for (let c = 30; c < w - 30; c += 22) {
      const len = 12 + ((c * 13) % 18);
      this.drawLine(buf, w, h, c, 12, c, 12 + len, 1, 2);
    }
  }

  // ------------------------------------------
  // PATH 1: SIMULATION CORE
  // Subject: Monolithic supercomputer terminal with oscilloscope waveform
  // ------------------------------------------
  private renderSimulationCore(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, _frame: number): void {
    const coreX = cx - 55;
    const coreY = cy - 48;
    this.drawOutlineRect(buf, w, h, coreX, coreY, 110, 96, 1, 3);

    // Large central monitor display
    this.drawSolidRect(buf, w, h, coreX + 10, coreY + 10, 90, 56, 0);
    this.drawOutlineRect(buf, w, h, coreX + 10, coreY + 10, 90, 56, 1, 2);

    // Oscilloscope audio/brain wave across screen
    const waveY = coreY + 38;
    for (let wx = coreX + 14; wx < coreX + 96; wx += 2) {
      const waveOffset = Math.sin((wx * 0.18) + (this.tickCount * 0.2)) * 10;
      this.drawSolidRect(buf, w, h, wx, Math.floor(waveY + waveOffset), 2, 2, 1);
    }

    // Keyboard console desk below monitor
    this.drawOutlineRect(buf, w, h, coreX + 6, coreY + 70, 98, 20, 1, 2);
    this.drawDitherRect(buf, w, h, coreX + 10, coreY + 74, 90, 12, 'diagHatch');
  }

  // ------------------------------------------
  // PATH 2: PULSING ANTECHAMBER
  // Subject: Organic ribbed tendon archways tapering toward dark void
  // ------------------------------------------
  private renderPulsingAntechamber(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, _frame: number): void {
    // 4 concentric organic arches
    for (let a = 0; a < 4; a++) {
      const scale = 1 - a * 0.22;
      const aw = Math.floor(180 * scale);
      const ah = Math.floor(130 * scale);
      const ax = cx - Math.floor(aw / 2);
      const ay = cy - Math.floor(ah / 2);

      this.drawOutlineRect(buf, w, h, ax, ay, aw, ah, 1, 2);
      this.drawDitherRect(buf, w, h, ax + 2, ay + 2, aw - 4, 10, 'diagHatch');
    }

    // Center dark predator archway
    this.drawSolidRect(buf, w, h, cx - 18, cy - 14, 36, 44, 1);
    this.drawSolidRect(buf, w, h, cx - 14, cy - 10, 28, 40, 0);
  }

  // ------------------------------------------
  // ROOM 1: BEDROOM
  // Subject: Victorian 4-Poster Unmade Bed & Barred Gothic Window
  // ------------------------------------------
  private renderBedroom(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, frame: number): void {
    // 1. Barred Arched Window on Left Wall
    const winX = 22;
    const winY = 24;
    const winW = 38;
    const winH = 54;

    this.drawOutlineRect(buf, w, h, winX, winY, winW, winH, 1, 2);
    // Rounded arch top
    this.drawLine(buf, w, h, winX, winY + 12, winX + winW / 2, winY, 1, 2);
    this.drawLine(buf, w, h, winX + winW / 2, winY, winX + winW - 1, winY + 12, 1, 2);
    // Iron bars
    this.drawVLine(buf, w, h, winX + 12, winY + 4, winH - 6, 1);
    this.drawVLine(buf, w, h, winX + 25, winY + 4, winH - 6, 1);
    this.drawHLine(buf, w, h, winX + 2, winY + 28, winW - 4, 1);

    // Crescent moon outside window in deep black void
    const moonX = winX + 18;
    const moonY = winY + 14;
    this.drawCircle(buf, w, h, moonX, moonY, 6, false, true);
    this.drawCircle(buf, w, h, moonX + 2, moonY - 1, 5, false, true);

    // Diagonal moonbeam stipple ray across the floor
    for (let rY = winY + winH; rY < h - 10; rY += 3) {
      const t = (rY - (winY + winH)) / (h - winY - winH);
      const rayX = Math.floor((winX + 16) + t * 90);
      this.drawHLine(buf, w, h, rayX, rY, 26, 1);
    }

    // 2. Heavy Victorian Four-Poster Unmade Bed (Center/Foreground)
    const bedX = cx - 60;
    const bedY = cy + 6;
    const bedW = 120;
    const bedH = 68;

    // Headboard (High arched wooden back with carved molding)
    this.drawOutlineRect(buf, w, h, bedX + 16, bedY - 32, bedW - 32, 34, 1, 2);
    this.drawDitherRect(buf, w, h, bedX + 18, bedY - 30, bedW - 36, 14, 'stipple25');
    this.drawLine(buf, w, h, bedX + 16, bedY - 32, cx, bedY - 44, 1, 2);
    this.drawLine(buf, w, h, cx, bedY - 44, bedX + bedW - 16, bedY - 32, 1, 2);

    // Left Bedpost (Tall carved post with round decorative finial)
    this.drawVLine(buf, w, h, bedX + 12, bedY - 48, bedH + 48, 1);
    this.drawVLine(buf, w, h, bedX + 14, bedY - 48, bedH + 48, 1);
    this.drawCircle(buf, w, h, bedX + 13, bedY - 50, 4, true, true);

    // Right Bedpost
    this.drawVLine(buf, w, h, bedX + bedW - 14, bedY - 48, bedH + 48, 1);
    this.drawVLine(buf, w, h, bedX + bedW - 12, bedY - 48, bedH + 48, 1);
    this.drawCircle(buf, w, h, bedX + bedW - 13, bedY - 50, 4, true, true);

    // Mattress platform
    this.drawSolidRect(buf, w, h, bedX + 16, bedY, bedW - 32, 14, 0);
    this.drawOutlineRect(buf, w, h, bedX + 16, bedY, bedW - 32, 14, 1, 2);

    // Pillow with hollow head impression
    this.drawOutlineRect(buf, w, h, bedX + 24, bedY - 8, 32, 12, 1, 2);
    this.drawDitherRect(buf, w, h, bedX + 30, bedY - 5, 18, 6, 'checkered50');

    // Rumpled Unmade Quilt (heavy folds dangling over the mattress)
    this.drawOutlineRect(buf, w, h, bedX + 8, bedY + 12, bedW - 16, bedH - 24, 1, 2);
    this.drawDitherRect(buf, w, h, bedX + 10, bedY + 14, bedW - 20, 24, 'diagHatch');

    // Fold creases in the unmade sheets
    this.drawLine(buf, w, h, bedX + 24, bedY + 16, bedX + 48, bedY + 36, 1, 2);
    this.drawLine(buf, w, h, bedX + 54, bedY + 18, bedX + 82, bedY + 40, 1, 2);
    this.drawLine(buf, w, h, bedX + 78, bedY + 14, bedX + 104, bedY + 34, 1, 2);

    // Bed legs
    this.drawSolidRect(buf, w, h, bedX + 12, bedY + bedH - 12, 6, 16, 1);
    this.drawSolidRect(buf, w, h, bedX + bedW - 18, bedY + bedH - 12, 6, 16, 1);

    // Nightstand with Ringing Rotary Phone on the Left
    const phoneTableX = 14;
    const phoneTableY = cy + 24;
    this.drawOutlineRect(buf, w, h, phoneTableX, phoneTableY, 32, 38, 1, 2);
    this.drawSolidRect(buf, w, h, phoneTableX + 6, phoneTableY - 12, 20, 12, 1);
    this.drawCircle(buf, w, h, phoneTableX + 16, phoneTableY - 6, 4, false, false);
    this.drawHLine(buf, w, h, phoneTableX + 4, phoneTableY - 15, 24, 1);
    const ringJitter = (this.tickCount % 4 < 2) ? 1 : 0;
    this.drawLine(buf, w, h, phoneTableX + 2, phoneTableY - 18 + ringJitter, phoneTableX - 2, phoneTableY - 22 + ringJitter, 1, 1);
    this.drawLine(buf, w, h, phoneTableX + 30, phoneTableY - 18 - ringJitter, phoneTableX + 34, phoneTableY - 22 - ringJitter, 1, 1);

    // Scratching Closet Door on Right Wall
    const closetX = w - 46;
    const closetY = 22;
    this.drawOutlineRect(buf, w, h, closetX, closetY, 34, 110, 1, 2);
    this.drawCircle(buf, w, h, closetX + 6, closetY + 54, 3, true, true);
    this.drawLine(buf, w, h, closetX + 10, closetY + 28, closetX + 24, closetY + 44, 1, 2);
    this.drawLine(buf, w, h, closetX + 15, closetY + 26, closetX + 29, closetY + 42, 1, 2);
    this.drawLine(buf, w, h, closetX + 20, closetY + 24, closetX + 34, closetY + 40, 1, 2);

    // Frame 1 animation: Dark clawed shadow hand reaches 14px out from under bed
    if (frame === 1) {
      const clawX = bedX + 38;
      const clawY = bedY + bedH - 4;
      this.drawSolidRect(buf, w, h, clawX, clawY, 18, 4, 1);
      // Fingers
      this.drawLine(buf, w, h, clawX + 18, clawY, clawX + 26, clawY - 3, 1, 2);
      this.drawLine(buf, w, h, clawX + 18, clawY + 2, clawX + 28, clawY + 2, 1, 2);
      this.drawLine(buf, w, h, clawX + 18, clawY + 4, clawX + 25, clawY + 7, 1, 2);
    }
  }

  // ------------------------------------------
  // ROOM 2: HALLWAY
  // Subject: Hanging Bell Lamp, Light Beam & Gouged Portrait
  // ------------------------------------------
  private renderHallway(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, frame: number): void {
    // 1. Gouged Portrait on Left Wall
    const portX = 28;
    const portY = cy - 40;
    const portW = 34;
    const portH = 48;

    this.drawOutlineRect(buf, w, h, portX, portY, portW, portH, 1, 2);
    this.drawOutlineRect(buf, w, h, portX + 4, portY + 4, portW - 8, portH - 8, 1, 1);
    this.drawDitherRect(buf, w, h, portX + 6, portY + 6, portW - 12, portH - 12, 'stipple25');

    // Oval face silhouette inside frame
    const faceX = portX + Math.floor(portW / 2);
    const faceY = portY + 18;
    this.drawCircle(buf, w, h, faceX, faceY, 9, false, true);

    // Gouged hollow black eye sockets
    this.drawSolidRect(buf, w, h, faceX - 5, faceY - 2, 3, 4, 0);
    this.drawSolidRect(buf, w, h, faceX + 2, faceY - 2, 3, 4, 0);

    // Dripping black tears from sockets down canvas
    const dripLen = frame === 1 ? 16 : 9;
    this.drawVLine(buf, w, h, faceX - 4, faceY + 2, dripLen, 1);
    this.drawVLine(buf, w, h, faceX + 3, faceY + 2, dripLen, 1);

    // 2. Hanging Overhead Industrial Lamp (sways in frame 1)
    const lampSway = frame === 1 ? 7 : 0;
    const lampX = cx + lampSway;
    const lampY = cy - 28;

    // Electrical cord from ceiling
    this.drawLine(buf, w, h, cx, 0, lampX, lampY, 1, 2);

    // Flared metal lamp shade
    this.drawLine(buf, w, h, lampX - 16, lampY + 10, lampX + 16, lampY + 10, 1, 2);
    this.drawLine(buf, w, h, lampX - 6, lampY, lampX - 16, lampY + 10, 1, 2);
    this.drawLine(buf, w, h, lampX + 6, lampY, lampX + 16, lampY + 10, 1, 2);

    // Bare glowing bulb
    this.drawCircle(buf, w, h, lampX, lampY + 14, 4, true, true);

    // Stark conical beam of white light illuminating the corridor floor
    const coneBotW = 110;
    const coneLeft = lampX - coneBotW / 2;
    const coneRight = lampX + coneBotW / 2;

    this.drawLine(buf, w, h, lampX - 12, lampY + 12, coneLeft, h - 1, 1, 1);
    this.drawLine(buf, w, h, lampX + 12, lampY + 12, coneRight, h - 1, 1, 1);

    // Illuminated pool of light on the floor
    this.drawDitherRect(buf, w, h, coneLeft + 12, h - 36, coneBotW - 24, 30, 'checkered50');
  }

  // ------------------------------------------
  // ROOM 3: KITCHEN
  // Subject: Heavy Butcher Block & Rusted Meat Cleaver
  // ------------------------------------------
  private renderKitchen(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, frame: number): void {
    // 1. Vintage Refrigerator in Background (Right)
    const frX = cx + 58;
    const frY = cy - 42;
    const frW = 42;
    const frH = 74;

    this.drawOutlineRect(buf, w, h, frX, frY, frW, frH, 1, 2);
    // Freezer split line
    this.drawHLine(buf, w, h, frX, frY + 26, frW, 1);
    // Chrome latch handle
    this.drawSolidRect(buf, w, h, frX + 6, frY + 14, 3, 8, 1);
    this.drawSolidRect(buf, w, h, frX + 6, frY + 38, 3, 10, 1);

    // 2. Ceiling Hanging Meat Hooks
    const hookX1 = cx - 44;
    this.drawVLine(buf, w, h, hookX1, 0, 32, 1);
    this.drawLine(buf, w, h, hookX1, 32, hookX1 + 8, 40, 1, 2);
    this.drawLine(buf, w, h, hookX1 + 8, 40, hookX1 + 2, 44, 1, 2);

    // 3. Massive Heavy Butcher Block Table (Center Foreground)
    const tabW = 130;
    const tabH = 64;
    const tabX = cx - tabW / 2;
    const tabY = cy + 12;

    // Wooden Block Top Slab (thick timber with woodgrain)
    this.drawOutlineRect(buf, w, h, tabX, tabY, tabW, 20, 1, 2);
    this.drawDitherRect(buf, w, h, tabX + 4, tabY + 4, tabW - 8, 12, 'diagHatch');

    // Cross-braced heavy square table legs
    this.drawSolidRect(buf, w, h, tabX + 10, tabY + 20, 12, tabH - 20, 1);
    this.drawSolidRect(buf, w, h, tabX + tabW - 22, tabY + 20, 12, tabH - 20, 1);
    // Cross brace timber
    this.drawHLine(buf, w, h, tabX + 10, tabY + 42, tabW - 22, 1);
    this.drawHLine(buf, w, h, tabX + 10, tabY + 44, tabW - 22, 1);

    // 4. Menacing Rusted Meat Cleaver (Jammed deep into center block)
    const clX = cx - 8;
    const clY = tabY - 26;

    // Heavy rectangular steel blade angled into wood
    this.drawOutlineRect(buf, w, h, clX, clY, 32, 28, 1, 2);
    this.drawDitherRect(buf, w, h, clX + 2, clY + 2, 28, 24, 'stipple25');

    // Notched, jagged blade edge
    this.drawLine(buf, w, h, clX, clY + 8, clX + 6, clY + 12, 0, 2);
    this.drawLine(buf, w, h, clX, clY + 18, clX + 8, clY + 22, 0, 2);

    // Wooden handle with rivets
    this.drawLine(buf, w, h, clX + 32, clY + 4, clX + 54, clY - 14, 1, 4);
    this.drawCircle(buf, w, h, clX + 38, clY - 1, 2, true, true);
    this.drawCircle(buf, w, h, clX + 46, clY - 8, 2, true, true);

    // Dripping dark fluid from cleaver tip onto block
    const dropY = frame === 1 ? tabY + 12 : tabY + 4;
    this.drawCircle(buf, w, h, clX + 2, dropY, 2, true, true);
  }

  // ------------------------------------------
  // ROOM 4: STAIRWELL
  // Subject: Descending Wooden Stairs, Railing & Claw Scores
  // ------------------------------------------
  private renderStairwell(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, frame: number): void {
    // 1. Plaster Wall with 3 Deep Claw Gouges
    const clawStartX = cx - 50;
    const clawStartY = cy - 42;
    for (let c = 0; c < 3; c++) {
      const offY = c * 8;
      this.drawLine(buf, w, h, clawStartX, clawStartY + offY, clawStartX + 38, clawStartY + offY + 18, 1, 2);
      this.drawLine(buf, w, h, clawStartX + 38, clawStartY + offY + 18, clawStartX + 70, clawStartY + offY + 12, 1, 2);
    }

    // 2. Steep Wooden Stairs Descending Diagonally into Pitch Black Void
    const stepCount = 6;
    const startX = cx - 50;
    const startY = cy - 8;
    const stepW = 100;
    const stepRise = 14;

    for (let i = 0; i < stepCount; i++) {
      const curY = startY + i * stepRise;
      const curX = startX + i * 8;

      // Wooden step tread (horizontal)
      this.drawOutlineRect(buf, w, h, curX, curY, stepW - i * 8, 6, 1, 2);
      this.drawDitherRect(buf, w, h, curX + 2, curY + 1, stepW - i * 8 - 4, 4, 'checkered50');

      // Step riser (vertical face)
      this.drawHLine(buf, w, h, curX, curY + 6, stepW - i * 8, 1);
    }

    // 3. Carved Wooden Banister & Vertical Spindles
    const banStartX = startX - 4;
    const banStartY = startY - 26;
    const banEndX = startX + 54;
    const banEndY = startY + stepCount * stepRise - 26;

    // Handrail
    this.drawLine(buf, w, h, banStartX, banStartY, banEndX, banEndY, 1, 3);

    // Vertical spindles
    for (let s = 0; s < stepCount; s++) {
      const spX = banStartX + Math.floor((banEndX - banStartX) * (s / (stepCount - 1)));
      const topSpY = banStartY + Math.floor((banEndY - banStartY) * (s / (stepCount - 1)));
      const botSpY = startY + s * stepRise;
      this.drawVLine(buf, w, h, spX, topSpY, botSpY - topSpY, 1);
    }

    // Heavy Newel Post at the bottom landing
    this.drawSolidRect(buf, w, h, banEndX - 2, banEndY - 6, 8, 38, 1);
    this.drawCircle(buf, w, h, banEndX + 2, banEndY - 10, 5, true, true);

    // Frame 1 animation: Shadow claw creeping up step 3
    if (frame === 1) {
      const shadowX = startX + 28;
      const shadowY = startY + 2 * stepRise;
      this.drawSolidRect(buf, w, h, shadowX, shadowY, 20, 5, 1);
      this.drawLine(buf, w, h, shadowX + 20, shadowY, shadowX + 28, shadowY - 4, 1, 2);
      this.drawLine(buf, w, h, shadowX + 20, shadowY + 3, shadowX + 30, shadowY + 2, 1, 2);
    }
  }

  // ------------------------------------------
  // ROOM 5: BASEMENT
  // Subject: Riveted Cast-Iron Boiler & Fire Grate Mouth
  // ------------------------------------------
  private renderBasement(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, frame: number): void {
    // 1. Crisscrossing Industrial Overhead Steam Pipes
    this.drawHLine(buf, w, h, 0, 20, w, 1);
    this.drawHLine(buf, w, h, 0, 24, w, 1);
    // Pipe flange joints
    for (let pX = 40; pX < w; pX += 80) {
      this.drawSolidRect(buf, w, h, pX, 17, 6, 11, 1);
    }

    // Vertical pressure pipe down to furnace
    this.drawVLine(buf, w, h, cx + 46, 24, 38, 1);
    this.drawVLine(buf, w, h, cx + 50, 24, 38, 1);
    // Valve wheel
    this.drawCircle(buf, w, h, cx + 48, 44, 7, false, true);

    // 2. Towering Cast-Iron Furnace / Boiler (Center)
    const fnW = 86;
    const fnH = 78;
    const fnX = cx - fnW / 2;
    const fnY = cy - 14;

    // Domed rounded top
    this.drawLine(buf, w, h, fnX + 10, fnY, fnX + fnW - 10, fnY, 1, 2);
    this.drawLine(buf, w, h, fnX, fnY + 16, fnX + 10, fnY, 1, 2);
    this.drawLine(buf, w, h, fnX + fnW - 10, fnY, fnX + fnW, fnY + 16, 1, 2);

    // Cylindrical iron body
    this.drawOutlineRect(buf, w, h, fnX, fnY + 16, fnW, fnH - 16, 1, 2);
    this.drawDitherRect(buf, w, h, fnX + 4, fnY + 18, fnW - 8, 16, 'diagHatch');

    // Round Rivets along boiler seams
    for (let rX = fnX + 6; rX < fnX + fnW - 6; rX += 10) {
      this.drawCircle(buf, w, h, rX, fnY + 18, 1, true, true);
      this.drawCircle(buf, w, h, rX, fnY + fnH - 4, 1, true, true);
    }

    // Circular dial pressure gauge (needle in the danger red zone)
    const gaugeX = cx;
    const gaugeY = fnY + 26;
    this.drawCircle(buf, w, h, gaugeX, gaugeY, 9, false, true);
    this.drawLine(buf, w, h, gaugeX, gaugeY, gaugeX + 6, gaugeY - 5, 1, 2);

    // Iron Firebox Hatch (Resembles an open snarling monster mouth)
    const hatchW = 46;
    const hatchH = 26;
    const hatchX = cx - hatchW / 2;
    const hatchY = fnY + 42;

    this.drawSolidRect(buf, w, h, hatchX, hatchY, hatchW, hatchH, 0);
    this.drawOutlineRect(buf, w, h, hatchX, hatchY, hatchW, hatchH, 1, 2);

    // Horizontal tooth-like iron grate bars
    const grateSpread = frame === 1 ? 5 : 4;
    for (let gY = hatchY + 4; gY < hatchY + hatchH - 2; gY += grateSpread) {
      this.drawHLine(buf, w, h, hatchX + 2, gY, hatchW - 4, 1);
    }

    // Glowing hot coals inside grate
    this.drawDitherRect(buf, w, h, hatchX + 4, hatchY + 6, hatchW - 8, hatchH - 10, 'checkered50');

    // Steam plume puffs out in frame 1
    if (frame === 1) {
      this.drawDitherRect(buf, w, h, cx + 54, 38, 24, 14, 'stipple25');
    }
  }

  // ------------------------------------------
  // ROOM 6: CORRIDOR / FLESH VAULT
  // Subject: Biomechanical Ribcage Arches & Colossal Biological Eye
  // ------------------------------------------
  private renderCorridor(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, frame: number): void {
    // 1. Colossal Curved Bone Ribcage Arches Overhead
    const archCount = 5;
    for (let a = 0; a < archCount; a++) {
      const archY = 16 + a * 20;
      const spreadX = 40 + a * 18;

      // Left rib bone curving from floor to ceiling
      this.drawLine(buf, w, h, cx - spreadX, cy + 50, cx - spreadX + 24, archY + 12, 1, 3);
      this.drawLine(buf, w, h, cx - spreadX + 24, archY + 12, cx, archY, 1, 3);

      // Right rib bone
      this.drawLine(buf, w, h, cx + spreadX, cy + 50, cx + spreadX - 24, archY + 12, 1, 3);
      this.drawLine(buf, w, h, cx + spreadX - 24, archY + 12, cx, archY, 1, 3);

      // Vertebra joint knot
      this.drawCircle(buf, w, h, cx, archY, 4, true, true);
    }

    // Glistening vein clusters along the organic walls
    for (let v = 0; v < 4; v++) {
      this.drawDitherRect(buf, w, h, 20 + v * 12, cy - 20 + v * 8, 16, 12, 'stipple25');
      this.drawDitherRect(buf, w, h, w - 36 - v * 12, cy - 20 + v * 8, 16, 12, 'stipple25');
    }

    // 2. Colossal Biological Eye at the End of the Tunnel
    const eyeCX = cx;
    const eyeCY = cy;
    const eyeR = 22;

    // Heavy organic eye frame with fibrous tendrils
    this.drawCircle(buf, w, h, eyeCX, eyeCY, eyeR + 4, false, true);
    this.drawCircle(buf, w, h, eyeCX, eyeCY, eyeR, true, true);

    // Eyelid slit
    this.drawLine(buf, w, h, eyeCX - eyeR, eyeCY, eyeCX + eyeR, eyeCY, 0, 2);

    // Iris & Pupil (Dilates wide in frame 1)
    const pupilW = frame === 1 ? 12 : 6;
    const pupilH = frame === 1 ? 18 : 22;
    this.drawSolidRect(buf, w, h, eyeCX - pupilW / 2, eyeCY - pupilH / 2, pupilW, pupilH, 0);

    // Slit pupil white gleam
    this.drawVLine(buf, w, h, eyeCX, eyeCY - 6, 12, 1);

    // Radiating nerve tendrils spreading onto walls
    this.drawLine(buf, w, h, eyeCX - eyeR, eyeCY - 6, eyeCX - eyeR - 18, eyeCY - 16, 1, 2);
    this.drawLine(buf, w, h, eyeCX - eyeR, eyeCY + 8, eyeCX - eyeR - 22, eyeCY + 18, 1, 2);
    this.drawLine(buf, w, h, eyeCX + eyeR, eyeCY - 6, eyeCX + eyeR + 18, eyeCY - 16, 1, 2);
    this.drawLine(buf, w, h, eyeCX + eyeR, eyeCY + 8, eyeCX + eyeR + 22, eyeCY + 18, 1, 2);
  }

  // ------------------------------------------
  // ROOM 7: MIRROR ROOM
  // Subject: Gothic Cheval Mirror & Terrifying Morphing/Enlarging Beast Reflection
  // ------------------------------------------
  private renderMirrorRoom(buf: Uint8Array, w: number, h: number, cx: number, cy: number, _zoom: number, _frame: number): void {
    const stage = this.mirrorMorphStage;

    // STAGE 4: Full-Screen Screen-Filling Surge (Glass Shattered!)
    if (stage === 4) {
      if (this.mirrorMode === 'meta') {
        // Full screen Glitched Terminal Hijack
        this.drawSolidRect(buf, w, h, 0, 0, w, h, 1);
        this.drawSolidRect(buf, w, h, 8, 8, w - 16, h - 16, 0);

        // Terminal scanlines
        for (let y = 14; y < h - 14; y += 3) {
          this.drawHLine(buf, w, h, 14, y, w - 28, 1);
        }

        // Central Terminal Code Box
        const tbX = cx - 90;
        const tbY = cy - 40;
        this.drawSolidRect(buf, w, h, tbX, tbY, 180, 80, 0);
        this.drawOutlineRect(buf, w, h, tbX, tbY, 180, 80, 1, 3);
        // Code lines & terminal cursor
        this.drawHLine(buf, w, h, tbX + 12, tbY + 20, 156, 1);
        this.drawHLine(buf, w, h, tbX + 12, tbY + 36, 120, 1);
        this.drawHLine(buf, w, h, tbX + 12, tbY + 52, 140, 1);
        if (this.tickCount % 4 < 2) {
          this.drawSolidRect(buf, w, h, tbX + 12, tbY + 64, 12, 8, 1);
        }
        return;
      }

      // Inverted radial motion burst lines
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        this.drawLine(buf, w, h, cx, cy, cx + Math.cos(ang) * 160, cy + Math.sin(ang) * 100, 1, 1);
      }

      // Shattered glass shards flying outward
      for (let s = 0; s < 10; s++) {
        const sx = (s * 31) % w;
        const sy = (s * 23) % h;
        this.drawLine(buf, w, h, sx, sy, sx + 8, sy + 12, 1, 2);
      }

      // Colossal Horned Demon Beast Face Filling Screen
      const bCX = cx;
      const bCY = cy - 10;

      // Massive curved demonic horns reaching screen edges
      this.drawLine(buf, w, h, bCX - 30, bCY - 20, 20, 10, 1, 6);
      this.drawLine(buf, w, h, 20, 10, 40, 2, 1, 4);
      this.drawLine(buf, w, h, bCX + 30, bCY - 20, w - 20, 10, 1, 6);
      this.drawLine(buf, w, h, w - 20, 10, w - 40, 2, 1, 4);

      // Huge cranium silhouette with scanline stipple
      this.drawSolidRect(buf, w, h, bCX - 65, bCY - 30, 130, 60, 1);
      this.drawDitherRect(buf, w, h, bCX - 60, bCY - 26, 120, 24, 'diagHatch');

      // Giant gaping maw filled with razor-sharp fangs
      const mouthY = bCY + 36;
      this.drawSolidRect(buf, w, h, bCX - 50, mouthY, 100, 48, 0);
      this.drawOutlineRect(buf, w, h, bCX - 50, mouthY, 100, 48, 1, 3);

      // Top razor fangs
      for (let f = bCX - 42; f <= bCX + 42; f += 14) {
        this.drawLine(buf, w, h, f, mouthY, f + 5, mouthY + 22, 1, 3);
        this.drawLine(buf, w, h, f + 10, mouthY, f + 5, mouthY + 22, 1, 3);
      }
      // Bottom sharp teeth
      for (let f = bCX - 36; f <= bCX + 36; f += 14) {
        this.drawLine(buf, w, h, f, mouthY + 46, f + 4, mouthY + 28, 1, 3);
        this.drawLine(buf, w, h, f + 8, mouthY + 46, f + 4, mouthY + 28, 1, 3);
      }

      // Piercing White Diamond Slit Eyes
      const eyeW = 32;
      const eyeH = 20;
      // Left eye
      this.drawSolidRect(buf, w, h, bCX - 48, bCY - 6, eyeW, eyeH, 0);
      this.drawOutlineRect(buf, w, h, bCX - 48, bCY - 6, eyeW, eyeH, 1, 2);
      this.drawSolidRect(buf, w, h, bCX - 34, bCY - 4, 6, eyeH - 4, 1);

      // Right eye
      this.drawSolidRect(buf, w, h, bCX + 16, bCY - 6, eyeW, eyeH, 0);
      this.drawOutlineRect(buf, w, h, bCX + 16, bCY - 6, eyeW, eyeH, 1, 2);
      this.drawSolidRect(buf, w, h, bCX + 28, bCY - 4, 6, eyeH - 4, 1);
      return;
    }

    // STAGES 0 to 3: Progressive Zoom and Morphing inside the Mirror Frame
    const stageScales = [1.0, 1.35, 1.8, 2.3];
    const sScale = stageScales[stage] || 1.0;

    const mirW = Math.floor(68 * sScale);
    const mirH = Math.floor(96 * sScale);
    const mirX = cx - Math.floor(mirW / 2);
    const mirY = cy - Math.floor(mirH / 2) + Math.floor(10 * (1 - sScale / 2.3));

    // Mirror Frame & Arched Top
    this.drawOutlineRect(buf, w, h, mirX, mirY + 12, mirW, mirH - 12, 1, 2);
    this.drawLine(buf, w, h, mirX, mirY + 12, cx, mirY, 1, 2);
    this.drawLine(buf, w, h, cx, mirY, mirX + mirW, mirY + 12, 1, 2);

    // Carved Gargoyle Claw-Feet (visible at smaller zooms)
    if (stage < 2) {
      this.drawLine(buf, w, h, mirX - 6, mirY + mirH + 8, mirX + 6, mirY + mirH, 1, 3);
      this.drawLine(buf, w, h, mirX + mirW + 6, mirY + mirH + 8, mirX + mirW - 6, mirY + mirH, 1, 3);
    }

    // Mirror Glass Surface
    this.drawSolidRect(buf, w, h, mirX + 4, mirY + 8, mirW - 8, mirH - 12, 0);
    this.drawDitherRect(buf, w, h, mirX + 6, mirY + 10, mirW - 12, mirH - 16, 'stipple12');

    // Progressive Spiderweb Fractures across glass
    if (stage >= 1) {
      this.drawLine(buf, w, h, mirX + 8, mirY + 16, cx - 4, cy - 4, 1, 1);
      this.drawLine(buf, w, h, cx - 4, cy - 4, mirX + mirW - 12, mirY + 24, 1, 1);
    }
    if (stage >= 2) {
      this.drawLine(buf, w, h, cx - 4, cy - 4, cx + 18, cy + 28, 1, 1);
      this.drawLine(buf, w, h, cx + 18, cy + 28, mirX + mirW - 8, mirY + mirH - 20, 1, 1);
      this.drawLine(buf, w, h, cx - 4, cy - 4, mirX + 16, mirY + mirH - 16, 1, 1);
    }
    if (stage >= 3) {
      this.drawLine(buf, w, h, cx, mirY + 10, cx - 8, cy - 20, 1, 2);
      this.drawLine(buf, w, h, cx - 8, cy - 20, cx - 34, cy + 12, 1, 1);
      this.drawLine(buf, w, h, cx + 12, cy - 16, cx + 42, cy + 8, 1, 1);
    }

    const headCX = cx;
    const headCY = cy - Math.floor(4 * sScale);

    // ==========================================
    // STAGE 0: Ordinary Human Reflection
    // ==========================================
    if (stage === 0) {
      // Human Head
      this.drawSolidRect(buf, w, h, headCX - 11, headCY - 12, 22, 24, 1);
      // Human Shoulders
      this.drawSolidRect(buf, w, h, headCX - 22, headCY + 12, 44, 26, 1);
      // Normal Human Eyes
      this.drawSolidRect(buf, w, h, headCX - 6, headCY - 3, 3, 2, 0);
      this.drawSolidRect(buf, w, h, headCX + 3, headCY - 3, 3, 2, 0);
      // Nose bridge and closed mouth
      this.drawVLine(buf, w, h, headCX, headCY - 1, 4, 0);
      this.drawHLine(buf, w, h, headCX - 4, headCY + 6, 8, 0);
      return;
    }

    // ==========================================
    // STAGE 1: Corruption (Zoom 1.35x)
    // ==========================================
    if (stage === 1) {
      if (this.mirrorMode === 'meta') {
        this.drawSolidRect(buf, w, h, headCX - 12, headCY - 12, 24, 26, 1);
        for (let y = headCY - 10; y < headCY + 14; y += 3) {
          this.drawHLine(buf, w, h, headCX - 10, y, 20, 0);
        }
        this.drawSolidRect(buf, w, h, headCX - 8, headCY - 2, 5, 4, 1);
        this.drawSolidRect(buf, w, h, headCX + 3, headCY - 2, 5, 4, 1);
        return;
      }

      // Sprouting Horns (small, sharp)
      this.drawLine(buf, w, h, headCX - 8, headCY - 12, headCX - 18, headCY - 24, 1, 2);
      this.drawLine(buf, w, h, headCX + 8, headCY - 12, headCX + 18, headCY - 24, 1, 2);

      // Widening Head
      this.drawSolidRect(buf, w, h, headCX - 14, headCY - 12, 28, 26, 1);
      this.drawSolidRect(buf, w, h, headCX - 26, headCY + 14, 52, 30, 1);

      // Eyes turn piercing white dots
      this.drawSolidRect(buf, w, h, headCX - 7, headCY - 3, 4, 3, 0);
      this.drawSolidRect(buf, w, h, headCX + 3, headCY - 3, 4, 3, 0);
      this.drawSolidRect(buf, w, h, headCX - 6, headCY - 2, 2, 2, 1);
      this.drawSolidRect(buf, w, h, headCX + 4, headCY - 2, 2, 2, 1);

      // Mouth snarling slightly
      this.drawHLine(buf, w, h, headCX - 6, headCY + 6, 12, 0);
      return;
    }

    // ==========================================
    // STAGE 2: Jaw Splits or Digital Fragmentation (Zoom 1.8x)
    // ==========================================
    if (stage === 2) {
      if (this.mirrorMode === 'meta') {
        // Digital block noise dissolving face into matrix scanlines
        this.drawSolidRect(buf, w, h, headCX - 18, headCY - 16, 36, 40, 1);
        for (let y = headCY - 14; y < headCY + 22; y += 4) {
          this.drawDitherRect(buf, w, h, headCX - 16, y, 32, 2, 'checkered50');
        }
        return;
      }

      // Long curved beast horns
      this.drawLine(buf, w, h, headCX - 12, headCY - 14, headCX - 28, headCY - 34, 1, 3);
      this.drawLine(buf, w, h, headCX - 28, headCY - 34, headCX - 20, headCY - 40, 1, 2);
      this.drawLine(buf, w, h, headCX + 12, headCY - 14, headCX + 28, headCY - 34, 1, 3);
      this.drawLine(buf, w, h, headCX + 28, headCY - 34, headCX + 20, headCY - 40, 1, 2);

      // Broad demonic head & shoulders
      this.drawSolidRect(buf, w, h, headCX - 20, headCY - 14, 40, 34, 1);
      this.drawSolidRect(buf, w, h, headCX - 36, headCY + 20, 72, 36, 1);

      // Slit Predatory Glowing Eyes
      this.drawSolidRect(buf, w, h, headCX - 14, headCY - 5, 8, 4, 0);
      this.drawSolidRect(buf, w, h, headCX + 6, headCY - 5, 8, 4, 0);
      this.drawVLine(buf, w, h, headCX - 10, headCY - 5, 4, 1);
      this.drawVLine(buf, w, h, headCX + 10, headCY - 5, 4, 1);

      // Open Jaw with Fangs
      this.drawSolidRect(buf, w, h, headCX - 12, headCY + 8, 24, 10, 0);
      for (let t = headCX - 10; t <= headCX + 10; t += 5) {
        this.drawVLine(buf, w, h, t, headCY + 8, 4, 1);
        this.drawVLine(buf, w, h, t + 2, headCY + 14, 4, 1);
      }

      // Clawed hands pressing against glass
      const hY = headCY + 28;
      this.drawSolidRect(buf, w, h, mirX + 8, hY, 14, 10, 1);
      this.drawSolidRect(buf, w, h, mirX + mirW - 22, hY, 14, 10, 1);
      for (let f = 0; f < 3; f++) {
        this.drawVLine(buf, w, h, mirX + 10 + f * 4, hY - 6, 6, 1);
        this.drawVLine(buf, w, h, mirX + mirW - 20 + f * 4, hY - 6, 6, 1);
      }
      return;
    }

    // ==========================================
    // STAGE 3: Full Monster Face or Glowing Aperture Eye (Zoom 2.3x)
    // ==========================================
    if (stage === 3) {
      if (this.mirrorMode === 'meta') {
        // Giant glowing terminal aperture eye looking through screen
        this.drawSolidRect(buf, w, h, headCX - 24, headCY - 20, 48, 48, 1);
        this.drawSolidRect(buf, w, h, headCX - 20, headCY - 16, 40, 40, 0);
        this.drawCircle(buf, w, h, headCX, headCY + 4, 14, true, true);
        this.drawCircle(buf, w, h, headCX, headCY + 4, 5, false, false);
        return;
      }
      // Massive Horns reaching frame corners
      this.drawLine(buf, w, h, headCX - 16, headCY - 16, headCX - 40, headCY - 44, 1, 4);
      this.drawLine(buf, w, h, headCX - 40, headCY - 44, headCX - 28, headCY - 52, 1, 3);
      this.drawLine(buf, w, h, headCX + 16, headCY - 16, headCX + 40, headCY - 44, 1, 4);
      this.drawLine(buf, w, h, headCX + 40, headCY - 44, headCX + 28, headCY - 52, 1, 3);

      // Giant Demonic Skull Face filling mirror
      this.drawSolidRect(buf, w, h, headCX - 32, headCY - 18, 64, 48, 1);
      this.drawDitherRect(buf, w, h, headCX - 28, headCY - 14, 56, 14, 'diagHatch');

      // Piercing Star-Slit Diamond Eyes
      this.drawSolidRect(buf, w, h, headCX - 22, headCY - 6, 14, 10, 0);
      this.drawSolidRect(buf, w, h, headCX + 8, headCY - 6, 14, 10, 0);
      this.drawLine(buf, w, h, headCX - 15, headCY - 8, headCX - 15, headCY + 5, 1, 2);
      this.drawLine(buf, w, h, headCX + 15, headCY - 8, headCX + 15, headCY + 5, 1, 2);

      // Wide Snarling Fanged Maw
      const jawY = headCY + 14;
      this.drawSolidRect(buf, w, h, headCX - 22, jawY, 44, 20, 0);
      this.drawOutlineRect(buf, w, h, headCX - 22, jawY, 44, 20, 1, 2);

      // Upper fangs
      for (let t = headCX - 18; t <= headCX + 18; t += 7) {
        this.drawLine(buf, w, h, t, jawY, t + 2, jawY + 9, 1, 2);
      }
      // Lower fangs
      for (let t = headCX - 15; t <= headCX + 15; t += 7) {
        this.drawLine(buf, w, h, t, jawY + 20, t + 2, jawY + 11, 1, 2);
      }

      // Claws scratching fiercely against glass
      const cY = headCY + 40;
      this.drawSolidRect(buf, w, h, mirX + 8, cY, 18, 14, 1);
      this.drawSolidRect(buf, w, h, mirX + mirW - 26, cY, 18, 14, 1);
      for (let f = 0; f < 4; f++) {
        this.drawLine(buf, w, h, mirX + 10 + f * 4, cY, mirX + 6 + f * 4, cY - 10, 1, 2);
        this.drawLine(buf, w, h, mirX + mirW - 24 + f * 4, cY, mirX + mirW - 28 + f * 4, cY - 10, 1, 2);
      }
      return;
    }
  }
}
