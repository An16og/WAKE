import type { ChallengeTemplate } from '@wake/shared';

export interface RoomExit {
  direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  targetRoomId: string;
  locked?: boolean;
  requiredItem?: string;
  lockDescription?: string;
}

export interface StoryRoom {
  id: string;
  name: string;
  narration: string[];
  firstPersonDrift: string[];
  challengeTemplate?: ChallengeTemplate;
  defaultChallengeId?: string;
  exits: RoomExit[];
  items: string[];
  checkpoint: boolean;
}

export const STORY_ROOMS: Record<string, StoryRoom> = {
  bedroom: {
    id: 'bedroom',
    name: 'COLD BEDROOM',
    narration: [
      'You open your eyes. The mattress is damp with perspiration.',
      'A metallic screech echoes beneath the floorboards.',
      'You know without looking that something impossible is tracking your scent.'
    ],
    firstPersonDrift: [
      'I woke up drenched in cold sweat.',
      'Something moved in the floorboards beneath my feet.'
    ],
    challengeTemplate: 'wordle',
    defaultChallengeId: 'fallback-wordle-1',
    exits: [
      { direction: 'north', targetRoomId: 'hallway', locked: false }
    ],
    items: ['flashlight', 'iron_key'],
    checkpoint: true
  },

  hallway: {
    id: 'hallway',
    name: 'FLICKERING HALLWAY',
    narration: [
      'A narrow gallery lined with peeling wallpaper.',
      'A single bulb swings overhead, humming at 60 Hz.',
      'The junction box on the wall sparked when you stepped inside.',
      'You hear heavy footsteps drag across the wood behind you.'
    ],
    firstPersonDrift: [
      'The hallway smelled like ozone and old wet timber.',
      'The footsteps were keeping pace with my heartbeat.'
    ],
    challengeTemplate: 'simon',
    defaultChallengeId: 'fallback-simon-1',
    exits: [
      { direction: 'south', targetRoomId: 'bedroom' },
      { direction: 'north', targetRoomId: 'kitchen', locked: true, lockDescription: 'The electrical latch is dead. Align the breaker sequence to power it.' }
    ],
    items: ['chalk'],
    checkpoint: false
  },

  kitchen: {
    id: 'kitchen',
    name: 'RUINED KITCHEN',
    narration: [
      'Black grease coats the counters. Flies circle the rusted sink.',
      'At the wooden table sits a hunched silhouette, dealing greasy cards.',
      'It does not look up. "Play a hand," a voice rattles inside your skull.',
      '"Or I step closer."'
    ],
    firstPersonDrift: [
      'The grease on the table smelled familiar.',
      'The voice in my skull felt less like a threat and more like memory.'
    ],
    challengeTemplate: 'blackjack',
    defaultChallengeId: 'fallback-blackjack-1',
    exits: [
      { direction: 'south', targetRoomId: 'hallway' },
      { direction: 'east', targetRoomId: 'pantry' },
      { direction: 'north', targetRoomId: 'stairwell', locked: true, lockDescription: 'The Thing blocks the doorway with its long arms until you win.' }
    ],
    items: ['salt_shaker'],
    checkpoint: true
  },

  pantry: {
    id: 'pantry',
    name: 'DARK PANTRY (OPTIONAL ALCOVE)',
    narration: [
      'Shelves loaded with rotten cans labeled in a script you cannot read.',
      'You find a bottle of pure medical ethanol.',
      'Drinking a sip clears the static in your mind. The monster paused outside.'
    ],
    firstPersonDrift: [
      'I hid among the rotten cans. The monster waited outside, listening.'
    ],
    exits: [
      { direction: 'west', targetRoomId: 'kitchen' }
    ],
    items: ['ethanol', 'journal_page'],
    checkpoint: false
  },

  stairwell: {
    id: 'stairwell',
    name: 'ROTTED STAIRWELL',
    narration: [
      'Steps descend into absolute blackness. The air turns freezing cold.',
      'Every step groans underfoot like cracking ribs.',
      'You cannot see where the steps lead without feeling the cold walls.'
    ],
    firstPersonDrift: [
      'I took the stairs down into the pitch black.',
      'My fingers dragged against wet brick.'
    ],
    challengeTemplate: 'dark_maze',
    defaultChallengeId: 'fallback-dark_maze-1',
    exits: [
      { direction: 'south', targetRoomId: 'kitchen' },
      { direction: 'down', targetRoomId: 'basement', locked: true, lockDescription: 'The dark maze must be navigated to find the basement landing.' }
    ],
    items: [],
    checkpoint: true
  },

  basement: {
    id: 'basement',
    name: 'CONCRETE BASEMENT',
    narration: [
      'Pipes rattle overhead, spitting hot vapor.',
      'An iron furnace looms in the center, welded shut with an inscription.',
      'The shadow behind you is now six feet long. You feel hot breath on your neck.'
    ],
    firstPersonDrift: [
      'The heat from the furnace felt like my own skin burning.',
      'I looked at my shadow. It didn\'t have human shoulders.'
    ],
    challengeTemplate: 'cipher',
    defaultChallengeId: 'fallback-cipher-1',
    exits: [
      { direction: 'up', targetRoomId: 'stairwell' },
      { direction: 'north', targetRoomId: 'corridor', locked: true, lockDescription: 'The cipher lock on the heavy iron bulkhead must be decrypted.' }
    ],
    items: ['wrench'],
    checkpoint: true
  },

  corridor: {
    id: 'corridor',
    name: 'PULSING CORRIDOR',
    narration: [
      'The walls are no longer drywall. They are wet, twitching tendon.',
      'You are running now, but your feet make heavy, clicking claw sounds.',
      'Why is it that every door unlocked just as you reached it?'
    ],
    firstPersonDrift: [
      'The walls beat in rhythm with my pulse.',
      'I was no longer running from the thing in the dark.',
      'I was heading home.'
    ],
    challengeTemplate: 'wordle',
    defaultChallengeId: 'fallback-wordle-2',
    exits: [
      { direction: 'south', targetRoomId: 'basement' },
      { direction: 'north', targetRoomId: 'mirror_room', locked: true, lockDescription: 'Whisper the final word of dread to unseal the mirror chamber.' }
    ],
    items: [],
    checkpoint: true
  },

  mirror_room: {
    id: 'mirror_room',
    name: 'THE MIRROR VAULT',
    narration: [
      'A circular chamber paved with polished obsidian.',
      'In the center stands a floor-to-ceiling mirror framed in silver.',
      'Type "look mirror" or "approach mirror" to see who made it to the end.'
    ],
    firstPersonDrift: [
      'I finally stood before the glass.',
      'There was never anyone behind me.',
      'I was the only one in the house.'
    ],
    exits: [],
    items: [],
    checkpoint: true
  }
};
