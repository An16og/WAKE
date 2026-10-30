export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export type ParsedCommand =
  | { type: 'look'; target?: string }
  | { type: 'go'; direction: Direction }
  | { type: 'take'; item: string }
  | { type: 'use'; item: string; target?: string }
  | { type: 'inventory' }
  | { type: 'help' }
  | { type: 'map' }
  | { type: 'safe' }
  | { type: 'mute' }
  | { type: 'action'; verb: string; arg: string }
  | { type: 'unknown'; raw: string };

const DIRECTION_ALIASES: Record<string, Direction> = {
  n: 'north',
  north: 'north',
  s: 'south',
  south: 'south',
  e: 'east',
  east: 'east',
  w: 'west',
  west: 'west',
  u: 'up',
  up: 'up',
  d: 'down',
  down: 'down'
};

const COMMON_COMMANDS = [
  'look',
  'look mirror',
  'go north',
  'go south',
  'go east',
  'go west',
  'go up',
  'go down',
  'take',
  'use',
  'inventory',
  'map',
  'safe',
  'mute',
  'help'
];

export function parseCommand(raw: string): ParsedCommand {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return { type: 'unknown', raw: '' };
  }

  // Single-letter direction aliases: n, s, e, w, u, d
  if (DIRECTION_ALIASES[trimmed]) {
    return { type: 'go', direction: DIRECTION_ALIASES[trimmed] };
  }

  const parts = trimmed.split(/\s+/);
  const verb = parts[0];
  const rest = parts.slice(1).join(' ');

  switch (verb) {
    case 'look':
    case 'l':
    case 'examine':
    case 'inspect':
      return { type: 'look', target: rest || undefined };

    case 'go':
    case 'move':
    case 'walk':
    case 'run':
      if (DIRECTION_ALIASES[rest]) {
        return { type: 'go', direction: DIRECTION_ALIASES[rest] };
      }
      return { type: 'unknown', raw };

    case 'take':
    case 'get':
    case 'grab':
    case 'pickup':
      if (!rest) return { type: 'unknown', raw };
      return { type: 'take', item: rest };

    case 'use':
    case 'apply':
      if (!rest) return { type: 'unknown', raw };
      const [item, ...targetParts] = rest.split(/\s+(?:on|with)\s+/);
      return {
        type: 'use',
        item: item.trim(),
        target: targetParts.length > 0 ? targetParts.join(' ').trim() : undefined
      };

    case 'inventory':
    case 'inv':
    case 'i':
      return { type: 'inventory' };

    case 'help':
    case '?':
      return { type: 'help' };

    case 'map':
    case 'm':
      return { type: 'map' };

    case 'safe':
      return { type: 'safe' };

    case 'mute':
    case 'sound':
      return { type: 'mute' };

    default:
      return { type: 'action', verb, arg: rest };
  }
}

export function getAutocompleteSuggestions(prefix: string): string[] {
  const p = prefix.trim().toLowerCase();
  if (!p) return COMMON_COMMANDS.slice(0, 5);
  return COMMON_COMMANDS.filter((cmd) => cmd.startsWith(p));
}
