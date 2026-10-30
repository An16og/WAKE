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

  // 8x8 1-bit Stipple Dither Matrix (Classic Macintosh / Atkinson Thresholds)
  private readonly DITHER_MATRIX_8X8: number[][] = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];

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
    // Render at crisp retro resolution (e.g. 320x180) then scale up without antialiasing
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
    }, 90);
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

  private draw(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const imgData = this.ctx.createImageData(w, h);
    const data = imgData.data;

    // 1-Bit Palette: pure black vs pure white (or pure phosphor green)
    const onR = this.isMonochrome ? 255 : 51;
    const onG = this.isMonochrome ? 255 : 255;
    const onB = this.isMonochrome ? 255 : 51;

    // Transition zoom and head-bob offsets across the 4 frames
    let zoomFactor = 1.0;
    let bobY = 0;

    if (this.isTransitioning) {
      // Frame 0: zoom 1.0
      // Frame 1: zoom 1.35, bob down
      // Frame 2: zoom 1.8, threshold flash
      // Frame 3: zoom 1.15, settling
      if (this.transitionFrame === 1) {
        zoomFactor = 1.35;
        bobY = 4;
      } else if (this.transitionFrame === 2) {
        zoomFactor = 1.75;
        bobY = -2;
      } else if (this.transitionFrame === 3) {
        zoomFactor = 1.15;
        bobY = 1;
      }
    } else {
      // Subtle 1-pixel breathing idle
      bobY = Math.sin(this.tickCount * 0.04) > 0.7 ? 1 : 0;
    }

    // Rasterize 2.5D Room into Intensity Buffer (0 = Pitch Black, 64 = Stark White)
    const intensityBuffer = new Uint8Array(w * h);

    this.renderRoomGeometry(this.currentRoomId, w, h, cx, cy + bobY, zoomFactor, intensityBuffer);

    // Apply Heavy 1-bit Atkinson / Macintosh Stipple Dithering
    for (let y = 0; y < h; y++) {
      const yMod = y & 7;
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const val = intensityBuffer[idx];
        const threshold = this.DITHER_MATRIX_8X8[yMod][x & 7];

        const pixelOn = val > threshold;
        const pixelIdx = idx * 4;

        if (pixelOn) {
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

  private renderRoomGeometry(
    roomId: string,
    w: number,
    h: number,
    cx: number,
    cy: number,
    zoom: number,
    buf: Uint8Array
  ): void {
    // 2.5D Doom Raycast Opaque Perspective Bounds
    const halfW = (w * 0.22) * zoom;
    const halfH = (h * 0.22) * zoom;

    const leftWallX = Math.floor(cx - halfW);
    const rightWallX = Math.floor(cx + halfW);
    const topWallY = Math.floor(cy - halfH);
    const botWallY = Math.floor(cy + halfH);

    // 1. Opaque Left & Right Walls
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;

        // Outside back wall bounds = Left/Right walls, ceiling, or floor
        if (x < leftWallX) {
          // Left Wall: intensity scales from foreground (52) to depth (16)
          const t = x / Math.max(1, leftWallX);
          const wallIntensity = Math.floor(54 - t * 38);
          // Panel vertical seams every 16 pixels
          const isSeam = (x % 14 === 0) || (x === leftWallX - 1);
          buf[idx] = isSeam ? 64 : wallIntensity;
        } else if (x > rightWallX) {
          // Right Wall
          const t = (w - x) / Math.max(1, w - rightWallX);
          const wallIntensity = Math.floor(54 - t * 38);
          const isSeam = ((w - x) % 14 === 0) || (x === rightWallX);
          buf[idx] = isSeam ? 64 : wallIntensity;
        } else if (y < topWallY) {
          // Ceiling: Recessed stipple slats
          const isRafter = (y % 10 === 0);
          buf[idx] = isRafter ? 35 : 12;
        } else if (y > botWallY) {
          // Floor: Perspective slats
          const isTileLine = (y % 12 === 0);
          buf[idx] = isTileLine ? 42 : 18;
        } else {
          // Back Wall Base (Center frame)
          buf[idx] = 22;
        }
      }
    }

    // 2. Back Doorway Arch
    const doorW = Math.floor(halfW * 0.85);
    const doorH = Math.floor(halfH * 1.55);
    const doorLeft = Math.floor(cx - doorW / 2);
    const doorRight = Math.floor(cx + doorW / 2);
    const doorTop = Math.floor(botWallY - doorH);

    for (let y = doorTop; y < botWallY; y++) {
      for (let x = doorLeft; x < doorRight; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          // Doorway frame border
          if (x === doorLeft || x === doorRight - 1 || y === doorTop) {
            buf[y * w + x] = 64; // Stark white border
          } else {
            buf[y * w + x] = 4; // Pitch black void inside doorway
          }
        }
      }
    }

    // 3. Room-Specific 1-Bit Pixel Art Props
    this.renderSubject1Bit(roomId, w, h, cx, cy, botWallY, doorLeft, doorRight, doorTop, buf);
  }

  private renderSubject1Bit(
    roomId: string,
    w: number,
    h: number,
    cx: number,
    _cy: number,
    botWallY: number,
    doorLeft: number,
    doorRight: number,
    doorTop: number,
    buf: Uint8Array
  ): void {
    switch (roomId) {
      case 'bedroom': {
        // Stark dithered Bed silhouette on the left foreground
        const bedW = 55;
        const bedH = 32;
        const bedX = 8;
        const bedY = h - bedH - 4;
        for (let y = bedY; y < bedY + bedH; y++) {
          for (let x = bedX; x < bedX + bedW; x++) {
            if (x < w && y < h) {
              const isPillow = (x > bedX + 4 && x < bedX + 16 && y > bedY + 4 && y < bedY + 12);
              const isFrame = (x === bedX || x === bedX + bedW - 1 || y === bedY);
              buf[y * w + x] = isFrame ? 64 : isPillow ? 58 : 34;
            }
          }
        }

        // Barred Window on Back Wall Left
        const winX = doorLeft - 32;
        const winY = doorTop + 4;
        const winW = 22;
        const winH = 26;
        for (let y = winY; y < winY + winH; y++) {
          for (let x = winX; x < winX + winW; x++) {
            if (x >= 0 && x < w && y >= 0 && y < h) {
              const isBorder = (x === winX || x === winX + winW - 1 || y === winY || y === winY + winH - 1);
              const isBar = (x === winX + 11) || (y === winY + 13);
              buf[y * w + x] = (isBorder || isBar) ? 64 : 2;
            }
          }
        }
        break;
      }

      case 'hallway': {
        // Swinging Overhead Light Fixture
        const wireX = cx;
        const bulbY = doorTop - 12;
        for (let y = 0; y < bulbY; y++) {
          buf[y * w + wireX] = 64;
        }
        // Bulb
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx * dx + dy * dy <= 9) {
              buf[(bulbY + dy) * w + (wireX + dx)] = 64;
            }
          }
        }
        break;
      }

      case 'kitchen': {
        // Table in center foreground with rusted knife
        const tabW = 90;
        const tabH = 24;
        const tabX = cx - tabW / 2;
        const tabY = h - tabH - 12;

        for (let y = tabY; y < tabY + tabH; y++) {
          for (let x = tabX; x < tabX + tabW; x++) {
            if (x >= 0 && x < w && y >= 0 && y < h) {
              const isBorder = (x === tabX || x === tabX + tabW - 1 || y === tabY || y === tabY + 6);
              buf[y * w + x] = isBorder ? 64 : 28;
            }
          }
        }
        // Table legs
        for (let y = tabY + tabH; y < h - 2; y++) {
          buf[y * w + (tabX + 4)] = 64;
          buf[y * w + (tabX + tabW - 5)] = 64;
        }
        // Knife on table
        for (let k = 0; k < 12; k++) {
          buf[(tabY + 3) * w + (cx - 6 + k)] = 64;
        }
        break;
      }

      case 'stairwell': {
        // 1-Bit Descending Stair Tread Steps
        let sY = doorTop + 6;
        const sH = Math.floor((botWallY - doorTop - 6) / 5);
        for (let s = 0; s < 5; s++) {
          for (let y = sY; y < sY + sH; y++) {
            for (let x = doorLeft + 2; x < doorRight - 2; x++) {
              if (x >= 0 && x < w && y >= 0 && y < h) {
                const isTread = (y === sY);
                buf[y * w + x] = isTread ? 64 : (s % 2 === 0 ? 30 : 12);
              }
            }
          }
          sY += sH;
        }
        break;
      }

      case 'basement': {
        // Iron Furnace in Center
        const fnW = 46;
        const fnH = 48;
        const fnX = cx - fnW / 2;
        const fnY = botWallY - fnH;

        for (let y = fnY; y < fnY + fnH; y++) {
          for (let x = fnX; x < fnX + fnW; x++) {
            if (x >= 0 && x < w && y >= 0 && y < h) {
              const isBorder = (x === fnX || x === fnX + fnW - 1 || y === fnY);
              const isGrate = (y > fnY + 22 && y < fnY + 38 && x > fnX + 8 && x < fnX + fnW - 8);
              buf[y * w + x] = isBorder ? 64 : isGrate ? ((x % 3 === 0) ? 64 : 4) : 32;
            }
          }
        }
        // Steam pipes across ceiling
        for (let x = 0; x < w; x++) {
          buf[18 * w + x] = 64;
          buf[20 * w + x] = 64;
        }
        break;
      }

      case 'corridor': {
        // Ribcage Biological Arches
        for (let a = doorTop - 8; a < botWallY; a += 14) {
          for (let x = doorLeft - 8; x <= doorRight + 8; x++) {
            const dy = Math.sin(((x - (doorLeft - 8)) / (doorRight - doorLeft + 16)) * Math.PI) * 10;
            const py = Math.floor(a - dy);
            if (py >= 0 && py < h && x >= 0 && x < w) {
              buf[py * w + x] = 64;
            }
          }
        }
        break;
      }

      case 'mirror_room': {
        // Mirror on Pedestal with Twitching Silhouette
        const mirW = 42;
        const mirH = 62;
        const mirX = cx - mirW / 2;
        const mirY = botWallY - mirH - 6;

        for (let y = mirY; y < mirY + mirH; y++) {
          for (let x = mirX; x < mirX + mirW; x++) {
            if (x >= 0 && x < w && y >= 0 && y < h) {
              const isBorder = (x === mirX || x === mirX + mirW - 1 || y === mirY || y === mirY + mirH - 1);
              buf[y * w + x] = isBorder ? 64 : 16;
            }
          }
        }

        // Dark Humanoid Silhouette in Mirror
        const headCX = cx;
        const headCY = mirY + 16;
        for (let dy = -6; dy <= 6; dy++) {
          for (let dx = -6; dx <= 6; dx++) {
            if (dx * dx + dy * dy <= 36) {
              buf[(headCY + dy) * w + (headCX + dx)] = 2; // Dark silhouette
            }
          }
        }
        // Shoulders
        for (let y = headCY + 7; y < mirY + mirH - 4; y++) {
          for (let x = cx - 12; x <= cx + 12; x++) {
            buf[y * w + x] = 2;
          }
        }
        // Glowing beast eye in reflection
        buf[(headCY - 1) * w + (headCX - 2)] = 64;
        buf[(headCY - 1) * w + (headCX + 2)] = 64;
        break;
      }
    }
  }
}
