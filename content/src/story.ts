import type { ChallengeTemplate } from '@wake/shared';

export interface RoomExit {
  direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  targetRoomId: string;
  locked?: boolean;
  lockDescription?: string;
}

export interface StoryRoom {
  id: string;
  name: string;
  branch?: 'meta' | 'beast' | 'root';
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
    name: 'ROOM 01 // THE AWAKENING',
    branch: 'root',
    narration: [
      'You open your eyes in suffocating darkness. The mattress is damp with perspiration.',
      'On the nightstand, an antique rotary telephone rings violently: RRR-ING... RRR-ING...',
      'Behind the closet door, sharp nails scrape frantically against the plaster.'
    ],
    firstPersonDrift: [
      'I woke up drenched in cold sweat.',
      'The telephone wouldn\'t stop ringing. Something was breathing inside the walls.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'bandersnatch-bedroom-dilemma',
    exits: [],
    items: [],
    checkpoint: true
  },

  server_archive: {
    id: 'server_archive',
    name: 'SECTOR 4 // THE SERVER ARCHIVE',
    branch: 'meta',
    narration: [
      'The bedroom walls peeled away into towering mainframe server racks.',
      'Green CRT screens line the corridor, rendering real-time keystroke logs and browser telemetry.',
      'A voice synthesizes from overhead speakers: "Identity mismatch detected. Who sits at the input bar?"'
    ],
    firstPersonDrift: [
      'The wallpaper dissolved into green phosphor scanlines.',
      'I could see my own thoughts blinking on the terminals like computer memory.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'bandersnatch-server-dilemma',
    exits: [],
    items: [],
    checkpoint: true
  },

  flesh_cellar: {
    id: 'flesh_cellar',
    name: 'SUB-LEVEL 0 // THE FLESH CELLAR',
    branch: 'beast',
    narration: [
      'The floorboards gave way. You landed knee-deep in cold, stagnant water.',
      'The air is thick with the copper stench of raw iron and predatory breath.',
      'Heavy dragging footsteps click in the darkness ahead, blocking the only blast door out.'
    ],
    firstPersonDrift: [
      'I fell into the dark. The water felt warm, like spilled blood.',
      'I listened for the monster. The growl was coming from my own throat.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'bandersnatch-cellar-dilemma',
    exits: [],
    items: [],
    checkpoint: true
  },

  simulation_core: {
    id: 'simulation_core',
    name: 'MAINFRAME // SIMULATION CORE',
    branch: 'meta',
    narration: [
      'You enter a subterranean vault occupied by a monolithic supercomputer terminal.',
      'The screen displays your exact current session, your hesitation latency, and your live decisions.',
      'The cursor pulses: "The simulated protagonist has arrived. Execute program termination protocol?"'
    ],
    firstPersonDrift: [
      'The room was vibrating at 60 Hz. The entire reality was just code running in a sandbox.',
      'I am staring at the terminal prompt that created me.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'bandersnatch-sim-dilemma',
    exits: [],
    items: [],
    checkpoint: true
  },

  pulsing_antechamber: {
    id: 'pulsing_antechamber',
    name: 'DEEP VAULT // PULSING ANTECHAMBER',
    branch: 'beast',
    narration: [
      'The corridor walls have transformed into wet, twitching sinew and bone.',
      'Your heart beats in deafening unison with the room. The human fear is evaporating.',
      'Ahead lies an antique silver archway. You feel razor fangs pressing through your gums.'
    ],
    firstPersonDrift: [
      'The walls beat in rhythm with my pulse.',
      'I was no longer running from the thing in the dark.',
      'I was heading to the glass to meet my true face.'
    ],
    challengeTemplate: 'bandersnatch',
    defaultChallengeId: 'bandersnatch-antechamber-dilemma',
    exits: [],
    items: [],
    checkpoint: true
  },

  mirror_vault: {
    id: 'mirror_vault',
    name: 'THRESHOLD // THE MIRROR VAULT',
    branch: 'root',
    narration: [
      'A vast circular chamber paved with polished obsidian.',
      'In the center stands a floor-to-ceiling mirror framed in fractured silver.',
      'Type "look mirror" or click the mirror prompt below to see what reached the end.'
    ],
    firstPersonDrift: [
      'I finally stood before the glass.',
      'There was never anyone behind me.',
      'The reflection is waiting.'
    ],
    exits: [],
    items: [],
    checkpoint: true
  }
};
