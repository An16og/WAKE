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
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-5',
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
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-2',
    exits: [
      { direction: 'south', targetRoomId: 'bedroom' },
      { direction: 'north', targetRoomId: 'kitchen', locked: true, lockDescription: 'The electrical latch is dead. Resolve the corridor dilemma to push through.' }
    ],
    items: ['chalk'],
    checkpoint: false
  },

  kitchen: {
    id: 'kitchen',
    name: 'RUINED KITCHEN',
    narration: [
      'Black grease coats the counters. Flies circle the rusted sink.',
      'At the wooden table sits a hunched silhouette, tapping long segmented claws.',
      'It does not look up. "Play your choice," a voice rattles inside your skull.',
      '"Or I step closer."'
    ],
    firstPersonDrift: [
      'The grease on the table smelled familiar.',
      'The voice in my skull felt less like a threat and more like memory.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-4',
    exits: [
      { direction: 'south', targetRoomId: 'hallway' },
      { direction: 'east', targetRoomId: 'pantry' },
      { direction: 'north', targetRoomId: 'stairwell', locked: true, lockDescription: 'The Thing blocks the doorway with its long arms until you make your move.' }
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
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-7',
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
      'A terrifying shriek reverberates down the stairs directly behind your heels.',
      'You are trapped between two desperate options as footsteps plunge toward you.'
    ],
    firstPersonDrift: [
      'I bolted down the stairs in the dark.',
      'The footsteps behind me were gaining fast.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-1',
    exits: [
      { direction: 'south', targetRoomId: 'kitchen' },
      { direction: 'down', targetRoomId: 'basement', locked: true, lockDescription: 'You must resolve the split-second escape dilemma to reach the landing.' }
    ],
    items: [],
    checkpoint: true
  },

  basement: {
    id: 'basement',
    name: 'CONCRETE BASEMENT',
    narration: [
      'Pipes rattle overhead, spitting hot vapor.',
      'An iron furnace screams in the center at critical pressure.',
      'The shadow behind you is now six feet long. You feel hot breath on your neck.'
    ],
    firstPersonDrift: [
      'The heat from the furnace felt like my own skin burning.',
      'I looked at my shadow. It didn\'t have human shoulders.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-3',
    exits: [
      { direction: 'up', targetRoomId: 'stairwell' },
      { direction: 'north', targetRoomId: 'corridor', locked: true, lockDescription: 'The furnace steam lock blocks the heavy iron bulkhead.' }
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
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'fallback-bandersnatch-6',
    exits: [
      { direction: 'south', targetRoomId: 'basement' },
      { direction: 'north', targetRoomId: 'mirror_room', locked: true, lockDescription: 'Make your final breakthrough decision to unseal the mirror vault.' }
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
