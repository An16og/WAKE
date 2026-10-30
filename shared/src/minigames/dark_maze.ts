import { DarkMazeParams, DarkMazeParamsSchema } from '../types.js';

export function validateDarkMazeParams(
  params: unknown
): { valid: boolean; error?: string; shortestPathLength?: number; data?: DarkMazeParams } {
  const parsed = DarkMazeParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  const { width, height, moveBudget, grid, start, exit } = parsed.data;

  if (grid.length !== height) {
    return { valid: false, error: `Grid row count ${grid.length} does not match specified height ${height}` };
  }

  for (let r = 0; r < height; r++) {
    if (grid[r].length !== width) {
      return {
        valid: false,
        error: `Grid row ${r} length ${grid[r].length} does not match specified width ${width}`
      };
    }
  }

  const [startR, startC] = start;
  const [exitR, exitC] = exit;

  if (startR < 0 || startR >= height || startC < 0 || startC >= width) {
    return { valid: false, error: `Start position [${startR}, ${startC}] out of bounds` };
  }
  if (exitR < 0 || exitR >= height || exitC < 0 || exitC >= width) {
    return { valid: false, error: `Exit position [${exitR}, ${exitC}] out of bounds` };
  }

  if (grid[startR][startC] === '#') {
    return { valid: false, error: `Start position [${startR}, ${startC}] is a solid wall '#'` };
  }
  if (grid[exitR][exitC] === '#') {
    return { valid: false, error: `Exit position [${exitR}, ${exitC}] is a solid wall '#'` };
  }

  // BFS Pathfinding
  const queue: Array<{ r: number; c: number; dist: number }> = [
    { r: startR, c: startC, dist: 0 }
  ];
  const visited = new Set<string>();
  visited.add(`${startR},${startC}`);

  const directions = [
    [-1, 0], // North
    [1, 0],  // South
    [0, 1],  // East
    [0, -1]  // West
  ];

  let foundDist: number | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.r === exitR && current.c === exitC) {
      foundDist = current.dist;
      break;
    }

    for (const [dr, dc] of directions) {
      const nr = current.r + dr;
      const nc = current.c + dc;

      if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
        const cell = grid[nr][nc];
        const key = `${nr},${nc}`;
        if (cell !== '#' && !visited.has(key)) {
          visited.add(key);
          queue.push({ r: nr, c: nc, dist: current.dist + 1 });
        }
      }
    }
  }

  if (foundDist === null) {
    return { valid: false, error: 'No reachable path exists from start to exit in this maze' };
  }

  if (foundDist > moveBudget) {
    return {
      valid: false,
      error: `Shortest path distance (${foundDist}) exceeds moveBudget (${moveBudget})`
    };
  }

  return {
    valid: true,
    shortestPathLength: foundDist,
    data: parsed.data
  };
}

export function renderDarkMaze(
  grid: string[],
  playerPos: [number, number],
  visionRadius: number
): string[] {
  const height = grid.length;
  const width = grid[0].length;
  const [pr, pc] = playerPos;
  const rendered: string[] = [];

  for (let r = 0; r < height; r++) {
    let line = '';
    for (let c = 0; c < width; c++) {
      const dist = Math.abs(r - pr) + Math.abs(c - pc);
      if (r === pr && c === pc) {
        line += '@';
      } else if (dist <= visionRadius) {
        line += grid[r][c];
      } else {
        line += ' '; // Fog of war
      }
    }
    rendered.push(line);
  }

  return rendered;
}
